// ── AUTH ──
const CU = JSON.parse(sessionStorage.getItem('al_user') || 'null');
if (!CU) location.href = 'index.html';

// ── DB ──
const db = {
  get: k => JSON.parse(localStorage.getItem(k) || '[]'),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};
const getSups = () => db.get('al_suppliers');
const setSups = v => db.set('al_suppliers', v);
const getUsers = () => db.get('al_users');
const setUsers = v => db.set('al_users', v);
const getSpecs = () => db.get('al_specialties');
const setSpecs = v => db.set('al_specialties', v);

// ── STATE ──
let mapObj = null, mapPin = null, curRating = 0;

// ── INIT ──
(function init() {
  const role = CU.role;
  // User card
  document.getElementById('uName').textContent = CU.name;
  document.getElementById('uAvatar').textContent = CU.name.charAt(0);
  const rb = document.getElementById('uRoleBadge');
  const rl = { admin: 'مدير عام', manager: 'مدير', employee: 'موظف' };
  const rc = { admin: 'role-admin', manager: 'role-manager', employee: 'role-employee' };
  rb.textContent = rl[role] || role;
  rb.className = 'role-badge ' + (rc[role] || '');

  if (role === 'admin' || role === 'manager') {
    document.getElementById('addDrop').style.display = 'block';
  }
  if (role !== 'admin') {
    document.getElementById('ddSpecialty').style.display = 'none';
  }
  if (role === 'admin') {
    document.getElementById('adminNav').style.display = 'block';
    document.getElementById('addUserBtn').style.display = 'block';
  }

  fillSpecDropdowns();
  renderHome();
  renderSups();
  if (role === 'admin') { renderUsers(); renderSpecsTable(); }
})();

// ── NAV ──
function showSec(s) {
  document.querySelectorAll('.section').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  const map = {
    home: { sec: 'secHome', nav: 'nav-home', title: 'الرئيسية' },
    suppliers: { sec: 'secSuppliers', nav: 'nav-suppliers', title: 'الموردون' },
    users: { sec: 'secUsers', nav: 'nav-users', title: 'إدارة المستخدمين' },
    specs: { sec: 'secSpecs', nav: 'nav-specs', title: 'التخصصات' }
  };
  const m = map[s];
  if (!m) return;
  document.getElementById(m.sec).classList.add('active');
  const nv = document.getElementById(m.nav);
  if (nv) nv.classList.add('active');
  document.getElementById('pageTitle').textContent = m.title;
  // addUserBtn shown always for admin (visible in topbar)
  if (s === 'home') renderHome();
  if (s === 'suppliers') renderSups();
  if (s === 'users') renderUsers();
  if (s === 'specs') renderSpecsTable();
}

// ── SPECIALTIES DROPDOWN ──
function fillSpecDropdowns() {
  const specs = getSpecs();
  ['fSpec', 'srchSpec'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const first = id === 'srchSpec' ? '<option value="">جميع التخصصات</option>' : '<option value="">-- اختر التخصص --</option>';
    el.innerHTML = first + specs.map(s => `<option value="${s}">${s}</option>`).join('');
  });
}

// ── HOME ──
function renderHome() {
  const sups = getSups(), users = getUsers(), specs = getSpecs();
  document.getElementById('stSup').textContent = sups.length;
  document.getElementById('stUsr').textContent = users.length;
  document.getElementById('stSpec').textContent = specs.length;
  const avg = sups.length ? (sups.reduce((a, s) => a + (s.rating || 0), 0) / sups.length).toFixed(1) : '-';
  document.getElementById('stAvg').textContent = avg !== '-' ? avg + ' ★' : '-';
  const top = [...sups].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 6);
  document.getElementById('topGrid').innerHTML = top.length
    ? top.map(supCard).join('')
    : `<div class="empty"><div class="empty-ico">🏢</div><h3>لا يوجد موردون بعد</h3><p>ابدأ بإضافة الموردين لظهورهم هنا</p></div>`;
}

// ── SUPPLIERS ──
function renderSups() { filterSups(); }

function filterSups() {
  const txt = (document.getElementById('srchTxt')?.value || '').toLowerCase();
  const spec = document.getElementById('srchSpec')?.value || '';
  const type = document.getElementById('srchType')?.value || '';
  let sups = getSups();
  if (txt) sups = sups.filter(s =>
    s.comp.toLowerCase().includes(txt) ||
    s.owner.toLowerCase().includes(txt) ||
    (s.phone || '').includes(txt));
  if (spec) sups = sups.filter(s => s.spec === spec);
  if (type === 'mat') sups = sups.filter(s => s.mat);
  else if (type === 'con') sups = sups.filter(s => s.con);
  else if (type) sups = sups.filter(s => (s.types || []).includes(type));
  const g = document.getElementById('supGrid');
  if (!g) return;
  g.innerHTML = sups.length
    ? sups.map(supCard).join('')
    : `<div class="empty"><div class="empty-ico">🔍</div><h3>لا توجد نتائج</h3><p>جرب تغيير معايير البحث</p></div>`;
}

function supCard(s) {
  const stars = [1,2,3,4,5].map(i => `<span class="star${i<=(s.rating||0)?' on':''}" >★</span>`).join('');
  const types = (s.types||[]).map(t=>`<span class="tag tag-${t}">${t}</span>`).join('');
  const extras = (s.mat?'<span class="tag tag-mat">مورد مواد</span>':'') + (s.con?'<span class="tag tag-con">منفذ</span>':'');
  const mapLnk = s.lat&&s.lng ? `<div class="sc-row"><span>📍</span><a href="https://maps.google.com?q=${s.lat},${s.lng}" target="_blank" onclick="event.stopPropagation()">عرض على الخريطة</a></div>` : '';
  return `<div class="supplier-card" onclick="showDetail('${s.id}')">
    <div class="sc-header">
      <div><div class="supplier-name">${esc(s.comp)}</div><span class="spec-tag">${esc(s.spec)}</span></div>
      <div class="stars">${stars}</div>
    </div>
    <div class="sc-body">
      <div class="sc-row"><span>👤</span> ${esc(s.owner)}</div>
      <div class="sc-row"><span>📞</span><a href="tel:${esc(s.phone)}" onclick="event.stopPropagation()">${esc(s.phone)}</a></div>
      ${mapLnk}
    </div>
    <div class="tags-row">${types}${extras}</div>
  </div>`;
}

function showDetail(id) {
  const s = getSups().find(x => x.id === id);
  if (!s) return;
  document.getElementById('dtTitle').textContent = '🏢 ' + s.comp;
  const stars = [1,2,3,4,5].map(i=>`<span class="star${i<=(s.rating||0)?' on':''}" >★</span>`).join('');
  const types = (s.types||[]).map(t=>`<span class="tag tag-${t}">${t}</span>`).join('') || '<span style="color:var(--text3)">غير محدد</span>';
  const mapLnk = s.lat&&s.lng ? `<a href="https://maps.google.com?q=${s.lat},${s.lng}" target="_blank" style="color:var(--primary-light)">فتح في خرائط جوجل ↗</a>` : 'غير محدد';
  document.getElementById('dtBody').innerHTML = `
    <div class="detail-grid">
      <div class="d-item"><div class="d-label">اسم الشركة</div><div class="d-val">${esc(s.comp)}</div></div>
      <div class="d-item"><div class="d-label">التخصص</div><div class="d-val"><span class="spec-tag">${esc(s.spec)}</span></div></div>
      <div class="d-item"><div class="d-label">اسم المالك</div><div class="d-val">${esc(s.owner)}</div></div>
      <div class="d-item"><div class="d-label">رقم الهاتف</div><div class="d-val"><a href="tel:${esc(s.phone)}" style="color:var(--primary-light)">${esc(s.phone)}</a></div></div>
      <div class="d-item"><div class="d-label">الموقع</div><div class="d-val">${mapLnk}</div></div>
      <div class="d-item"><div class="d-label">التقييم</div><div class="d-val"><div class="stars">${stars}</div></div></div>
      <div class="d-item"><div class="d-label">مورد مواد</div><div class="d-val">${s.mat?'✅ نعم':'❌ لا'}</div></div>
      <div class="d-item"><div class="d-label">منفذ وكوادر</div><div class="d-val">${s.con?'✅ نعم':'❌ لا'}</div></div>
      <div class="d-item d-full"><div class="d-label">نوع التاجر</div><div class="d-val" style="margin-top:5px"><div class="tags-row">${types}</div></div></div>
      ${s.notes?`<div class="d-item d-full"><div class="d-label">الملاحظات</div><div class="d-val">${esc(s.notes)}</div></div>`:''}
    </div>`;
  const canEdit = CU.role === 'admin' || CU.role === 'manager';
  const canDel = CU.role === 'admin';
  document.getElementById('dtFooter').innerHTML =
    `<button class="btn btn-ghost" onclick="closeM('mDetail')">إغلاق</button>` +
    (canEdit ? `<button class="btn btn-primary" onclick="editSup('${s.id}')">✏️ تعديل</button>` : '') +
    (canDel ? `<button class="btn btn-danger" onclick="askDelSup('${s.id}')">🗑️ حذف</button>` : '');
  openM('mDetail');
}

function editSup(id) {
  const s = getSups().find(x => x.id === id);
  if (!s) return;
  closeM('mDetail');
  document.getElementById('mSupTitle').textContent = '✏️ تعديل بيانات المورد';
  document.getElementById('editId').value = id;
  document.getElementById('fComp').value = s.comp;
  document.getElementById('fOwner').value = s.owner;
  document.getElementById('fSpec').value = s.spec;
  document.getElementById('fPhone').value = s.phone;
  document.getElementById('fLat').value = s.lat || '';
  document.getElementById('fLng').value = s.lng || '';
  document.getElementById('fNotes').value = s.notes || '';
  setCb('cbMat', 'vMat', s.mat);
  setCb('cbCon', 'vCon', s.con);
  document.querySelectorAll('.type-opt').forEach(el => el.classList.toggle('sel', (s.types||[]).includes(el.dataset.t)));
  curRating = s.rating || 0;
  updateStars();
  openM('mSupplier');
  setTimeout(() => {
    initMap();
    if (s.lat && s.lng && mapObj) {
      mapObj.setView([s.lat, s.lng], 13);
      if (mapPin) mapPin.setLatLng([s.lat, s.lng]);
      else mapPin = L.marker([s.lat, s.lng]).addTo(mapObj);
    }
    mapObj.invalidateSize();
  }, 250);
}

function saveSup() {
  const comp = document.getElementById('fComp').value.trim();
  const owner = document.getElementById('fOwner').value.trim();
  const spec = document.getElementById('fSpec').value;
  const phone = document.getElementById('fPhone').value.trim();
  if (!comp || !owner || !spec || !phone) { toast('يرجى تعبئة جميع الحقول المطلوبة (*)','err'); return; }
  const lat = parseFloat(document.getElementById('fLat').value) || null;
  const lng = parseFloat(document.getElementById('fLng').value) || null;
  const mat = document.getElementById('vMat').value === '1';
  const con = document.getElementById('vCon').value === '1';
  const types = [...document.querySelectorAll('.type-opt.sel')].map(el => el.dataset.t);
  const rating = curRating;
  const notes = document.getElementById('fNotes').value.trim();
  const id = document.getElementById('editId').value;
  const sups = getSups();
  if (id) {
    const i = sups.findIndex(s => s.id === id);
    if (i !== -1) sups[i] = { ...sups[i], comp, owner, spec, phone, lat, lng, mat, con, types, rating, notes };
    toast('تم تحديث بيانات المورد', 'ok');
  } else {
    sups.push({ id: Date.now().toString(), comp, owner, spec, phone, lat, lng, mat, con, types, rating, notes, at: new Date().toISOString() });
    toast('تم إضافة المورد بنجاح', 'ok');
  }
  setSups(sups);
  closeM('mSupplier');
  renderHome(); renderSups();
}

function askDelSup(id) {
  const s = getSups().find(x => x.id === id);
  if (!s) return;
  document.getElementById('confirmMsg').textContent = `هل أنت متأكد من حذف "${s.comp}"؟ لا يمكن التراجع.`;
  document.getElementById('confirmOk').onclick = () => {
    setSups(getSups().filter(x => x.id !== id));
    closeM('mConfirm'); closeM('mDetail');
    renderHome(); renderSups();
    toast('تم حذف المورد', 'ok');
  };
  openM('mConfirm');
}

// ── USERS ──
function renderUsers() {
  const users = getUsers();
  const rl = { admin: 'مدير عام', manager: 'مدير', employee: 'موظف' };
  const rc = { admin: 'role-admin', manager: 'role-manager', employee: 'role-employee' };
  document.getElementById('usersTbody').innerHTML = users.map((u, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${esc(u.name)}</strong></td>
      <td dir="ltr" style="text-align:right">${esc(u.username)}</td>
      <td><span class="role-badge ${rc[u.role]||''}">${rl[u.role]||u.role}</span></td>
      <td>${new Date(u.createdAt).toLocaleDateString('ar-IQ')}</td>
      <td>${u.id!=='1'?`<button class="btn btn-danger btn-sm" onclick="askDelUser('${u.id}')">🗑️</button>`:'<span style="color:var(--text3)">محمي</span>'}</td>
    </tr>`).join('');
}

function saveUser() {
  const role = document.getElementById('fRole').value;
  const name = document.getElementById('fUName').value.trim();
  const username = document.getElementById('fUUser').value.trim();
  const password = document.getElementById('fUPass').value.trim();
  if (!role||!name||!username||!password) { toast('يرجى تعبئة جميع الحقول','err'); return; }
  const users = getUsers();
  if (users.find(u => u.username === username)) { toast('اسم الدخول مستخدم مسبقاً','err'); return; }
  users.push({ id: Date.now().toString(), username, password, role, name, createdAt: new Date().toISOString() });
  setUsers(users);
  closeM('mUser');
  renderUsers(); renderHome();
  toast('تم إضافة المستخدم بنجاح','ok');
  ['fRole','fUName','fUUser','fUPass'].forEach(id => document.getElementById(id).value='');
}

function askDelUser(id) {
  const u = getUsers().find(x => x.id === id);
  if (!u) return;
  document.getElementById('confirmMsg').textContent = `هل أنت متأكد من حذف "${u.name}"؟`;
  document.getElementById('confirmOk').onclick = () => {
    setUsers(getUsers().filter(x => x.id !== id));
    closeM('mConfirm'); renderUsers(); renderHome();
    toast('تم حذف المستخدم','ok');
  };
  openM('mConfirm');
}

// ── SPECIALTIES ──
function renderSpecsTable() {
  const specs = getSpecs(), sups = getSups();
  document.getElementById('specsTbody').innerHTML = specs.map((s, i) => {
    const cnt = sups.filter(x => x.spec === s).length;
    return `<tr><td>${i+1}</td><td>${esc(s)}</td><td>${cnt}</td><td><button class="btn btn-danger btn-sm" onclick="askDelSpec(${i})">🗑️</button></td></tr>`;
  }).join('');
}

function saveSpec() {
  const name = document.getElementById('fSpecName').value.trim();
  if (!name) { toast('أدخل اسم التخصص','err'); return; }
  const specs = getSpecs();
  if (specs.includes(name)) { toast('التخصص موجود مسبقاً','err'); return; }
  specs.push(name);
  setSpecs(specs);
  fillSpecDropdowns();
  closeM('mSpecialty');
  renderSpecsTable();
  document.getElementById('fSpecName').value = '';
  toast('تم إضافة التخصص','ok');
}

function askDelSpec(i) {
  const specs = getSpecs();
  document.getElementById('confirmMsg').textContent = `هل أنت متأكد من حذف تخصص "${specs[i]}"؟`;
  document.getElementById('confirmOk').onclick = () => {
    specs.splice(i, 1);
    setSpecs(specs);
    fillSpecDropdowns();
    closeM('mConfirm');
    renderSpecsTable();
    toast('تم حذف التخصص','ok');
  };
  openM('mConfirm');
}

// ── MAP ──
function initMap() {
  if (mapObj) return;
  mapObj = L.map('supplierMap').setView([33.3152, 44.3661], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(mapObj);
  mapObj.on('click', e => {
    const { lat, lng } = e.latlng;
    document.getElementById('fLat').value = lat.toFixed(6);
    document.getElementById('fLng').value = lng.toFixed(6);
    if (mapPin) mapPin.setLatLng([lat, lng]);
    else mapPin = L.marker([lat, lng]).addTo(mapObj);
  });
}

function movePinFromInput() {
  const lat = parseFloat(document.getElementById('fLat').value);
  const lng = parseFloat(document.getElementById('fLng').value);
  if (!isNaN(lat) && !isNaN(lng) && mapObj) {
    mapObj.setView([lat, lng], 13);
    if (mapPin) mapPin.setLatLng([lat, lng]);
    else mapPin = L.marker([lat, lng]).addTo(mapObj);
  }
}

// ── CHECKBOXES ──
function toggleCb(fieldId, inputId) {
  const f = document.getElementById(fieldId);
  const inp = document.getElementById(inputId);
  const isYes = f.classList.contains('yes');
  f.className = f.className.replace(isYes?'yes':'no', isYes?'no':'yes');
  f.querySelector('.cb-box').textContent = isYes ? '✗' : '✓';
  inp.value = isYes ? '0' : '1';
}

function setCb(fieldId, inputId, val) {
  const f = document.getElementById(fieldId);
  const inp = document.getElementById(inputId);
  f.classList.remove('yes','no');
  f.classList.add(val?'yes':'no');
  f.querySelector('.cb-box').textContent = val ? '✓' : '✗';
  inp.value = val ? '1' : '0';
}

// ── RATING ──
function setRating(v) { curRating = v; updateStars(); }
function updateStars() {
  document.querySelectorAll('.r-star').forEach(s => s.classList.toggle('on', parseInt(s.dataset.v) <= curRating));
}

// ── MODAL ──
function openM(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'mSupplier') setTimeout(() => { initMap(); mapObj.invalidateSize(); }, 150);
}

function closeM(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'mSupplier') resetSupForm();
}

function resetSupForm() {
  document.getElementById('editId').value = '';
  document.getElementById('mSupTitle').textContent = '🏢 إضافة مورد جديد';
  ['fComp','fOwner','fPhone','fLat','fLng','fNotes'].forEach(i => { const el=document.getElementById(i); if(el) el.value=''; });
  document.getElementById('fSpec').value = '';
  setCb('cbMat','vMat',false); setCb('cbCon','vCon',false);
  document.querySelectorAll('.type-opt').forEach(el => el.classList.remove('sel'));
  curRating = 0; updateStars();
  if (mapPin && mapObj) { mapObj.removeLayer(mapPin); mapPin = null; }
  if (mapObj) mapObj.setView([33.3152, 44.3661], 6);
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) closeM(o.id); });
});

// ── DROPDOWN ──
function toggleDrop(id) { document.getElementById(id).classList.toggle('open'); }
function closeDrop() { document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open')); }
document.addEventListener('click', e => { if (!e.target.closest('.dropdown')) closeDrop(); });

// ── TOAST ──
function toast(msg, type='info') {
  const cls = { ok:'toast-ok', err:'toast-err', info:'toast-info' };
  const t = document.createElement('div');
  t.className = 'toast ' + (cls[type]||'toast-info');
  t.textContent = msg;
  document.getElementById('toastWrap').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── UTILS ──
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function logout() { sessionStorage.removeItem('al_user'); location.href='index.html'; }
