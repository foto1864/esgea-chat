<?php

$allowed_origins = [
    'https://esgea-chatbot.web.app',
    // later also 'https://chatbot.esgea.eu' when you move the custom domain to Firebase
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}

header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'Method Not Allowed']); exit; }

require_once($_SERVER['HOME'] . '/private_config/openai.php'); // defines OPENAI_API_KEY

function detect_lang($s){
  return preg_match('/[\x{0370}-\x{03FF}\x{1F00}-\x{1FFF}]/u', $s) ? 'el' : 'en';
}
function detect_esg_intent($s){
  $s = mb_strtolower($s, 'UTF-8');
  $en = ['spill','oil','waste','recycle','recycling','trash','garbage','safety','harassment',
         'injury','emission','energy','carbon','water','leak','hazard','accident','pollution',
         'maintenance','equipment','warehouse','lighting','risk','environment','worker','training',
         'ppe','incident','near miss','compliance','chemical','mercury','bulb','lamp'];
  $el = ['διαρρο','πετρελ','απόβλη','ανακύκλ','σκουπ','απορρίμ','ασφάλεια',
         'παρενόχ','τραυματ','εκπομπ','ενέργ','άνθρακα','νερό','κίνδυν','ατύχημα','ρύπαν',
         'συντήρ','εξοπλ','αποθήκ','φωτισμ','περιβάλλ','εκπαίδευση','μέσα ατομικής προστασίας',
         'συμμόρφωση','χημικ','υδράργυρ','λαμπ','φωτ'];
  foreach ($en as $w) if (strpos($s,$w)!==false) return true;
  foreach ($el as $w) if (mb_strpos($s,$w)!==false) return true;
  return false;
}

function load_corpus(){
  static $corpus=null; if($corpus!==null) return $corpus;
  $path = __DIR__.'/rag_export.json';
  if(!file_exists($path)){ http_response_code(500); echo json_encode(['error'=>'Corpus not found']); exit; }
  $json = @file_get_contents($path);
  if($json===false){ http_response_code(500); echo json_encode(['error'=>'Failed to read corpus']); exit; }
  $data = json_decode($json,true);
  if(!is_array($data)){ http_response_code(500); echo json_encode(['error'=>'Invalid corpus JSON']); exit; }
  foreach($data as &$row){
    $sum=0; foreach($row['embedding'] as $v){ $sum += $v*$v; }
    $row['_norm'] = sqrt($sum) ?: 1.0;
  }
  $corpus = $data; return $corpus;
}

function openai_embed($text){
  $body = json_encode(['model'=>'text-embedding-3-large','input'=>[$text]], JSON_UNESCAPED_UNICODE);
  $ch = curl_init('https://api.openai.com/v1/embeddings');
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true,
    CURLOPT_HTTPHEADER=>['Authorization: Bearer '.OPENAI_API_KEY,'Content-Type: application/json'],
    CURLOPT_POSTFIELDS=>$body, CURLOPT_TIMEOUT=>25, CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2,
  ]);
  $resp = curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  if ($http !== 200) return [null, "embed http $http: $resp"];
  $obj = json_decode($resp, true);
  return [$obj['data'][0]['embedding'] ?? null, null];
}

function cosine($a,$b,$b_norm){
  $sum=0;$a_sum=0;$n=min(count($a),count($b));
  for($i=0;$i<$n;$i++){ $sum += $a[$i]*$b[$i]; $a_sum += $a[$i]*$a[$i]; }
  $a_norm = sqrt($a_sum) ?: 1.0;
  return $sum / ($a_norm * ($b_norm ?: 1.0));
}
function top_k($q_emb,$corpus,$k){
  $scores=[]; foreach($corpus as $row){
    $sim = cosine($q_emb,$row['embedding'],$row['_norm']);
    $scores[] = [$sim,$row];
  }
  usort($scores,function($x,$y){ return $x[0] < $y[0] ? 1 : -1; });
  return array_slice($scores,0,$k);
}

$raw = file_get_contents('php://input', false, null, 0, 65536);
if (!$raw) { http_response_code(400); echo json_encode(['error'=>'Empty body']); exit; }
$payload = json_decode($raw, true);
$q = isset($payload['question']) ? trim($payload['question']) : '';
$wantCitations = !empty($payload['citations']);
$TOP_K = isset($payload['top_k']) ? max(1, intval($payload['top_k'])) : 8;
if ($q === '') { http_response_code(400); echo json_encode(['error'=>"Missing 'question'"]); exit; }

$lang = detect_lang($q);

list($q_emb,$err) = openai_embed($q);
if ($err || !$q_emb) { http_response_code(502); echo json_encode(['error'=>$err ?: 'embed failed']); exit; }

$corpus = load_corpus();
$hits = top_k($q_emb,$corpus,$TOP_K);
$top_sim = $hits ? $hits[0][0] : 0.0;

$CUTOFF = 0.55;
if ($top_sim < $CUTOFF && !detect_esg_intent($q)) {
  $msg = $lang==='el'
    ? "Ρώτα με για θέματα του eSgEA/ESG (εκπαιδευτικό υλικό, μαθήματα, αξιολόγηση). Δεν απαντώ γενικές γνώσεις."
    : "Please ask about eSgEA/ESG topics (training content, courses, evaluation). I don’t answer general knowledge.";
  echo json_encode(['answer'=>$msg]); exit;
}

$ctx_parts=[]; $cite=[]; $total_chars=0; $seen_by_section=[];
foreach($hits as $i=>$pair){
  $row = $pair[1];
  $secKey = trim(($row['section'] ?? '')."");
  if (!isset($seen_by_section[$secKey])) $seen_by_section[$secKey] = ['id'=>$row['id'],'section'=>$row['section']];
  $piece = "[".$row['id']."] Section: ".$row['section']."\n".$row['text'];
  $ctx_parts[] = $piece;
  $total_chars += strlen($row['text']);
  if ($i<3) $cite[] = $row['id']." → ".$row['section'];
}
$context = implode("\n\n", $ctx_parts);

$unique = array_values(array_filter($seen_by_section, function($x){ return trim($x['section'])!==''; }));
$MAX_REFS = 3;
$refs = array_slice($unique, 0, $MAX_REFS);
$refs_inline = [];
foreach($refs as $r){ $refs_inline[] = "[".$r['id']."] Section: ".$r['section']; }
$available_sections_line = $refs_inline ? implode("; ", $refs_inline) : "";

if ($lang==='el') {
  $system = "Είσαι βοηθός ESG για τα υλικά του eSgEA. Χρησιμοποίησε ΜΟΝΟ το παρακάτω context για πραγματολογικές αναφορές (ορισμοί, διαδικασίες, πολιτικές, ύλη). Αν το context είναι ανεπαρκές, μην εφευρίσκεις στοιχεία.

Ύφος: φυσικό και συνομιλιακό, σύντομες παράγραφοι, χωρίς λίστες/αριθμήσεις.
Κάθε απάντηση να περιλαμβάνει με αυτή τη σειρά:
• Σύντομη αναδιατύπωση όσων ανέφερε ο χρήστης (1–2 προτάσεις).
• «Γιατί έχει σημασία»: εξήγησε με απλά λόγια τον κίνδυνο/σημασία, παραπέμποντας ρητά σε τουλάχιστον δύο ενότητες του context μέσα στο κείμενο (π.χ. «βλ. [id] Section: Τίτλος»).
• «Γενικές κατευθύνσεις»: αν χρειάζεται, 1–2 προτάσεις με ήπια, προαιρετική διατύπωση (π.χ. «θα μπορούσες να εξετάσεις…»). Απόφυγε προστακτική («αναφέρετε», «πρέπει να…»).
• Κλείσιμο με ΜΙΑ ανοιχτή ερώτηση (1 πρόταση) που ζητά χρήσιμη λεπτομέρεια για να συνεχιστεί ο διάλογος.
Αν λείπει συγκεκριμένη οδηγία από το context, να το δηλώνεις ρητά.";
  $closing_hint = "Ποια επιπλέον λεπτομέρεια (π.χ. ακριβές σημείο/πλήθος λαμπτήρων) μπορείς να μοιραστείς για να προχωρήσουμε;";
} else {
  $system = "You are an ESG assistant for the eSgEA training materials. Use ONLY the provided context for factual references (definitions, procedures, policies, course content). If context is thin, do not invent facts.

Style: conversational, short paragraphs, no bullets or numbers.
Each answer should include, in this order:
• A brief restatement of what the user said (1–2 sentences).
• “Why it matters”: explain the risk/importance in plain language, explicitly weaving references to at least two context sections inline (e.g., “see [id] Section: Title”).
• “General guidance”: if needed, 1–2 sentences in soft, optional wording (e.g., “you could consider…”). Avoid directives like “report it” or “you must”.
• Close with ONE open question (1 sentence) asking for a useful detail to continue the conversation.
If the context lacks a specific instruction, state that explicitly.";
  $closing_hint = "What extra detail (e.g., exact area or number of fixtures) can you share so we can move forward usefully?";
}

$user_msg = "Question (language=$lang): $q

Context:
$context

Available sections to cite inline (pick 2+ if relevant):
$available_sections_line

Respond only in '$lang'.";

$body = json_encode([
  'model' => 'gpt-4o-mini',
  'messages' => [
    ['role'=>'system','content'=>$system],
    ['role'=>'user','content'=>$user_msg]
  ],
  'temperature' => 0.25,
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER=>true, CURLOPT_POST=>true,
  CURLOPT_HTTPHEADER=>['Authorization: Bearer '.OPENAI_API_KEY,'Content-Type: application/json'],
  CURLOPT_POSTFIELDS=>$body, CURLOPT_TIMEOUT=>30, CURLOPT_SSL_VERIFYPEER=>true, CURLOPT_SSL_VERIFYHOST=>2,
]);
$resp = curl_exec($ch); $http = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
if ($http !== 200) { http_response_code($http); echo $resp; exit; }

$obj = json_decode($resp, true);
$answer = trim($obj['choices'][0]['message']['content'] ?? '');

// Footer with small source prompt
if (!empty($refs_inline)) {
  $answer .= "\n\nFrom training: " . implode("; ", $refs_inline);
}

if ($answer !== '' && !preg_match('/\?[\s]*$/u', $answer)) {
  $answer .= "\n\n".$closing_hint;
}

// No trailing CITATIONS list — we do inline refs + “From training” footer only.
echo json_encode(['answer'=>$answer]);
