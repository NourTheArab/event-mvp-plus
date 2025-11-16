import React, { useEffect, useState } from 'react';

async function j(url, opts) {
  const r = await fetch(url, { credentials:'include', ...opts });
  const ct = r.headers.get('content-type') || '';
  return ct.includes('application/json') ? r.json() : null;
}

export default function Admin(){
  return (
    <div style={{display:'grid', gap:16}}>
      <h3>Admin</h3>
      <Users/>
      <Groups/>
      <Venues/>
    </div>
  );
}

function Users(){
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('admin');
  const [items, setItems] = useState([]);

  async function load(){ setItems((await j('/admin/users')) || []); }
  useEffect(()=>{ load(); }, []);

  async function setUserRole(e){
    e.preventDefault();
    if(!email) return;
    await j('/admin/users/role', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, role })
    });
    setEmail('');
    await load();
  }

  return (
    <section>
      <h4>Users</h4>
      <form onSubmit={setUserRole} style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="user@earlham.edu"/>
        <select value={role} onChange={e=>setRole(e.target.value)}>
          <option value="admin">admin</option>
          <option value="superadmin">superadmin</option>
          <option value="student">student</option>
        </select>
        <button>Save Role</button>
      </form>
      <ul>
        {items.map(u => <li key={u.id}>{u.email} — {u.role}</li>)}
      </ul>
    </section>
  );
}

function Groups(){
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [convenerEmail, setConvenerEmail] = useState('');

  async function load(){ setItems((await j('/admin/groups')) || []); }
  useEffect(()=>{ load(); }, []);

  async function add(e){
    e.preventDefault();
    if(!name) return;
    await j('/admin/groups', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, convenerEmail })
    });
    setName(''); setConvenerEmail('');
    await load();
  }

  async function del(id){
    await fetch(`/admin/groups/${id}`, { method:'DELETE', credentials:'include' });
    await load();
  }

  return (
    <section>
      <h4>Groups</h4>
      <form onSubmit={add} style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Group name"/>
        <input value={convenerEmail} onChange={e=>setConvenerEmail(e.target.value)} placeholder="Convener email (optional)"/>
        <button>Add</button>
      </form>
      <ul>
        {items.map(g => (
          <li key={g.id}>
            {g.name} {g.convenerEmail ? `— ${g.convenerEmail}` : ''}
            <button style={{marginLeft:8}} onClick={()=>del(g.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Venues(){
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(0);

  async function load(){ setItems((await j('/admin/venues')) || []); }
  useEffect(()=>{ load(); }, []);

  async function add(e){
    e.preventDefault();
    if(!name) return;
    await j('/admin/venues', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, capacity: Number(capacity) })
    });
    setName(''); setCapacity(0);
    await load();
  }

  async function del(id){
    await fetch(`/admin/venues/${id}`, { method:'DELETE', credentials:'include' });
    await load();
  }

  return (
    <section>
      <h4>Venues</h4>
      <form onSubmit={add} style={{display:'flex', gap:8, flexWrap:'wrap'}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Venue name"/>
        <input type="number" min="0" value={capacity} onChange={e=>setCapacity(e.target.value)} placeholder="Capacity"/>
        <button>Add</button>
      </form>
      <ul>
        {items.map(v => (
          <li key={v.id}>
            {v.name} (cap {v.capacity})
            <button style={{marginLeft:8}} onClick={()=>del(v.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
