import { Link } from 'react-router-dom'

export default function Mode() {
  return (
    <div style={{display:'grid',placeItems:'center',height:'100vh',background:'#f7fafc'}}>
      <div style={{background:'#fff',border:'1px solid #cbd5e1',borderRadius:16,padding:24,minWidth:320,textAlign:'center',boxShadow:'0 6px 24px rgba(15,23,42,.08)'}}>
        <h2 style={{margin:'0 0 4px'}}>eSgEA Chat</h2>
        <div style={{color:'#475569',fontSize:14,marginBottom:16}}>Choose mode</div>
        <div style={{display:'flex',gap:12,justifyContent:'center'}}>
          <Link to="/client" style={{background:'#2563eb',color:'#fff',padding:'10px 16px',borderRadius:12,textDecoration:'none'}}>Client</Link>
          <Link to="/mod" style={{background:'#0f766e',color:'#fff',padding:'10px 16px',borderRadius:12,textDecoration:'none'}}>Moderator</Link>
        </div>
      </div>
    </div>
  )
}