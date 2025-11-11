<?php
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error'=>'Method Not Allowed']); exit; }

require_once($_SERVER['HOME'] . '/private_config/openai.php'); // defines OPENAI_API_KEY

$raw = file_get_contents('php://input', false, null, 0, 65536);
if (!$raw) { http_response_code(400); echo json_encode(['error'=>'Empty body']); exit; }
$payload = json_decode($raw, true);
$q = isset($payload['question']) ? trim($payload['question']) : '';
$wantCitations = !empty($payload['citations']);
$TOP_K = isset($payload['top_k']) ? max(1, intval($payload['top_k'])) : 6;
if ($q === '') { http_response_code(400); echo json_encode(['error'=>"Missing 'question'"]); exit; }

function detect_lang($s){ // Greek vs other is enough
  $len = strlen($s);
  for($i=0;$i<$len;$i++){
    $ch = mb_substr($s,$i,1,'UTF-8');
    $code = IntlChar::ord($ch);
    if ($code>=0x0370 && $code<=0x03FF) return 'el';
  }
  return 'en';
}

function load_corpus(){
  static $corpus = null;
  if ($corpus !== null) return $corpus;
  $path = __DIR__ . '/rag_export.json'; // same folder as this PHP file
  if (!file_exists($path)) {
    // try sibling api/../data
    $alt = __DIR__ . '/rag_export.json';
  }
  $json = @file_get_contents($path);
  if ($json === false) { http_response_code(500); echo json_encode(['error'=>'Corpus not found']); exit; }
  $data = json_decode($json, true);
  if (!is_array($data)) { http_response_code(500); echo json_encode(['error'=>'Invalid corpus JSON']); exit; }
  // Precompute norms
  foreach ($data as &$row) {
    $e = $row['embedding'];
    $sum = 0.0;
    foreach ($e as $v) { $sum += $v*$v; }
    $row['_norm'] = sqrt($sum) ?: 1.0;
  }
  $corpus = $data;
  return $corpus;
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

function cosine($a, $b, $b_norm){
  $sum = 0.0; $a_sum=0.0;
  $n = min(count($a), count($b));
  for ($i=0;$i<$n;$i++){ $sum += $a[$i]*$b[$i]; $a_sum += $a[$i]*$a[$i]; }
  $a_norm = sqrt($a_sum) ?: 1.0;
  return $sum / ($a_norm * ($b_norm ?: 1.0));
}

function top_k($q_emb, $corpus, $k){
  $scores = [];
  foreach ($corpus as $row){
    $sim = cosine($q_emb, $row['embedding'], $row['_norm']);
    $scores[] = [$sim, $row];
  }
  usort($scores, function($x,$y){ return $x[0] < $y[0] ? 1 : -1; });
  return array_slice($scores, 0, $k);
}

$lang = detect_lang($q);
list($q_emb, $err) = openai_embed($q);
if ($err || !$q_emb) { http_response_code(502); echo json_encode(['error'=>$err ?: 'embed failed']); exit; }

$corpus = load_corpus();
$hits = top_k($q_emb, $corpus, $TOP_K);

// Off-topic guard: require strong similarity
$top_sim = $hits ? $hits[0][0] : 0.0;
$CUTOFF = 0.55; // tighten/loosen here
if ($top_sim < $CUTOFF) {
  $msg = $lang==='el'
    ? "Ρώτα με για θέματα του eSgEA/ESG (εκπαιδευτικό υλικό, μαθήματα, αξιολόγηση). Δεν απαντώ γενικές γνώσεις."
    : "Please ask about eSgEA/ESG topics (training content, courses, evaluation). I don’t answer general knowledge.";
  echo json_encode(['answer'=>$msg]); exit;
}

// Build context
$ctx_parts = [];
$cite = [];
foreach ($hits as $i => $pair){
  $row = $pair[1];
  $ctx_parts[] = "[".$row['id']."] Section: ".$row['section']."\n".$row['text'];
  if ($i < 3) $cite[] = $row['id']." → ".$row['section'];
}
$context = implode("\n\n", $ctx_parts);

$system = "Answer strictly and only from the provided context (sourced from training.esgea.eu). If the context is insufficient or off-topic, say you don't know and ask the user to stick to eSgEA/ESG topics. Never use outside knowledge. Never guess. Be concise.";
$user_msg = "Question (language=$lang): $q\n\nContext:\n$context\n\nRespond only in '$lang'. Do not mirror the context language.";

$body = json_encode([
  'model' => 'gpt-4o-mini',
  'messages' => [
    ['role'=>'system','content'=>$system],
    ['role'=>'user','content'=>$user_msg]
  ],
  'temperature' => 0.2,
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

if ($wantCitations) $answer .= "\n\nCITATIONS: ".implode(", ", $cite);
echo json_encode(['answer'=>$answer]);
