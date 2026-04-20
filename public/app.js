// ─── STATE ───────────────────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('admin_token') || null,
  username: localStorage.getItem('admin_username') || null,
  page: 'dashboard',
  data: {},
  pagination: {},
};

// ─── API ─────────────────────────────────────────────────────────────────────
async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}),
    },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
function logout() {
  state.token = null; state.username = null;
  localStorage.removeItem('admin_token'); localStorage.removeItem('admin_username');
  render();
}

// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
let modalCallback = null;
function confirm(title, body, cb, danger = true) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').textContent = body;
  const btn = document.getElementById('modal-confirm-btn');
  btn.className = 'btn ' + (danger ? 'btn-danger' : 'btn-primary');
  btn.textContent = danger ? 'Hapus' : 'Konfirmasi';
  modalCallback = cb;
  document.getElementById('confirm-modal').classList.add('open');
}
window.closeModal = () => { document.getElementById('confirm-modal').classList.remove('open'); modalCallback = null; };
document.getElementById('modal-confirm-btn').onclick = () => { if (modalCallback) { modalCallback(); closeModal(); } };

// ─── RENDER ──────────────────────────────────────────────────────────────────
function render() {
  const root = document.getElementById('root');
  if (!state.token) { root.innerHTML = renderLogin(); attachLogin(); return; }
  root.innerHTML = renderApp();
  attachNav();
  renderPage();
}

function renderLogin() {
  return `
  <div id="login-screen">
    <div class="login-card">
      <h2>max99 panel</h2>
      <p>Login untuk masuk ke panel administrasi</p>
      <div class="form-group">
        <label>Username</label>
        <input class="input" id="l-user" type="text" placeholder="admin username" autocomplete="username" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input class="input" id="l-pass" type="password" placeholder="••••••••" autocomplete="current-password" />
      </div>
      <div id="l-error" class="error-msg" style="display:none"></div>
      <button class="login-btn" id="l-btn">Masuk</button>
    </div>
  </div>`;
}

function attachLogin() {
  const btn = document.getElementById('l-btn');
  const doLogin = async () => {
    const username = document.getElementById('l-user').value.trim();
    const password = document.getElementById('l-pass').value;
    const errEl = document.getElementById('l-error');
    errEl.style.display = 'none';
    btn.textContent = 'Loading...'; btn.disabled = true;
    const res = await api('/auth/login', { method: 'POST', body: { username, password } });
    btn.textContent = 'Masuk'; btn.disabled = false;
    if (!res || res.error) { errEl.textContent = res?.error || 'Gagal login'; errEl.style.display = 'block'; return; }
    state.token = res.token; state.username = res.username;
    localStorage.setItem('admin_token', res.token); localStorage.setItem('admin_username', res.username);
    render();
  };
  btn.onclick = doLogin;
  document.getElementById('l-pass').onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
}

function renderApp() {
  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'Manajemen User', icon: '👥' },
    { id: 'register-special', label: 'Register Akun Spesial', icon: '⭐' },
    { id: 'chatrooms', label: 'Chatroom', icon: '💬' },
    { id: 'credits', label: 'Kredit & Transaksi', icon: '💰' },
    { id: 'credit-management', label: 'Manajemen Kredit', icon: '💳' },
    { id: 'managed-account', label: 'Managed Account', icon: '🔐' },
    { id: 'vouchers', label: 'Voucher', icon: '🎫' },
    { id: 'gifts', label: 'Virtual Gifts', icon: '🎁' },
    { id: 'store', label: 'Store', icon: '🛍️' },
    { id: 'merchants', label: 'Merchant', icon: '🏪' },
    { id: 'add-merchant', label: 'Tambah Merchant', icon: '➕' },
    { id: 'merchant-tags', label: 'Merchant Tags', icon: '🏷️' },
    { id: 'bots', label: 'Bot Service', icon: '🤖' },
    { id: 'admin-management', label: 'Manajemen Administrator', icon: '🛡️' },
    { id: 'broadcast', label: 'Broadcast Pesan', icon: '📢' },
    { id: 'apk-releases', label: 'Rilis APK', icon: '📦' },
  ];
  return `
  <div id="app">
    <aside id="sidebar">
      <div class="logo"><span class="logo-icon">⚡</span>migme Admin</div>
      <nav>${nav.map(n => `<div class="nav-item${state.page === n.id ? ' active' : ''}" data-page="${n.id}"><span class="icon">${n.icon}</span>${n.label}</div>`).join('')}</nav>
      <div class="user-info">
        <div class="avatar">${(state.username || 'A')[0].toUpperCase()}</div>
        <div><div class="name">${state.username || 'Admin'}</div><div class="role">Administrator</div></div>
        <button class="logout-btn" id="logout-btn">Keluar</button>
      </div>
    </aside>
    <main id="main">
      <div id="topbar"><h1 id="page-title">${nav.find(n=>n.id===state.page)?.label || 'Dashboard'}</h1></div>
      <div id="content"><div class="loading"><div class="spinner"></div>Memuat data...</div></div>
    </main>
  </div>`;
}

function attachNav() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => { state.page = el.dataset.page; render(); };
  });
  document.getElementById('logout-btn').onclick = logout;
}

async function renderPage() {
  const content = document.getElementById('content');
  switch (state.page) {
    case 'dashboard': await renderDashboard(content); break;
    case 'users': await renderUsers(content); break;
    case 'register-special': renderRegisterSpecial(content); break;
    case 'chatrooms': await renderChatrooms(content); break;
    case 'credits': await renderCredits(content); break;
    case 'credit-management': renderCreditManagement(content); break;
    case 'managed-account': renderManagedAccount(content); break;
    case 'vouchers': await renderVouchers(content); break;
    case 'gifts': await renderGifts(content); break;
    case 'store': await renderStore(content); break;
    case 'merchants': await renderMerchants(content); break;
    case 'add-merchant': renderAddMerchant(content); break;
    case 'merchant-tags': await renderMerchantTags(content); break;
    case 'bots': await renderBots(content); break;
    case 'admin-management': await renderAdminManagement(content); break;
    case 'broadcast': renderBroadcast(content); break;
    case 'apk-releases': await renderReleases(content); break;
    default: content.innerHTML = '<div class="empty">Halaman tidak ditemukan</div>';
  }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
async function renderDashboard(el) {
  const data = await api('/dashboard/stats');
  if (!data) return;
  const maxGrowth = Math.max(...(data.charts.userGrowth.map(r => parseInt(r.count)) || [1]), 1);

  el.innerHTML = `
  <div class="stats-grid">
    <div class="stat-card purple">
      <div class="stat-label">Total User</div>
      <div class="stat-value">${fmtNum(data.users.total)}</div>
      <div class="stat-sub">+${fmtNum(data.users.newToday)} hari ini · +${fmtNum(data.users.newThisWeek)} minggu ini</div>
    </div>
    <div class="stat-card green">
      <div class="stat-label">User Aktif</div>
      <div class="stat-value">${fmtNum(data.users.active)}</div>
      <div class="stat-sub">Tidak tersuspensi</div>
    </div>
    <div class="stat-card red">
      <div class="stat-label">User Tersuspensi</div>
      <div class="stat-value">${fmtNum(data.users.suspended)}</div>
      <div class="stat-sub">Akun diblokir</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-label">Total Chatroom</div>
      <div class="stat-value">${fmtNum(data.chatrooms.total)}</div>
      <div class="stat-sub">${fmtNum(data.chatrooms.active)} aktif</div>
    </div>
    <div class="stat-card orange">
      <div class="stat-label">Total Merchant</div>
      <div class="stat-value">${fmtNum(data.merchants.total)}</div>
      <div class="stat-sub">Merchant terdaftar</div>
    </div>
    <div class="stat-card blue">
      <div class="stat-label">Transaksi 24 Jam</div>
      <div class="stat-value">${fmtNum(data.credits.recentTransactions.count)}</div>
      <div class="stat-sub">Volume: ${fmtFloat(data.credits.recentTransactions.volume)}</div>
    </div>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-title">Pertumbuhan User (30 Hari)</div>
      <div class="chart-bar-wrap">
        ${data.charts.userGrowth.length === 0 ? '<div class="empty">Tidak ada data</div>' :
          data.charts.userGrowth.slice(-15).map(r => `
          <div class="chart-bar-row">
            <div class="chart-bar-label">${fmtDate(r.date)}</div>
            <div class="chart-bar-bg"><div class="chart-bar-fill" style="width:${(parseInt(r.count)/maxGrowth*100).toFixed(1)}%"></div></div>
            <div class="chart-bar-val">${r.count}</div>
          </div>`).join('')}
      </div>
    </div>
    <div class="card">
      <div class="card-title">Top User Kredit</div>
      ${data.charts.topCreditUsers.length === 0 ? '<div class="empty">Tidak ada data</div>' :
        `<table><thead><tr><th>Username</th><th>Balance</th><th>Mata Uang</th></tr></thead><tbody>
        ${data.charts.topCreditUsers.map(u => `
          <tr><td><strong>${esc(u.username)}</strong></td><td>${fmtFloat(u.balance)}</td><td>${esc(u.currency)}</td></tr>
        `).join('')}
        </tbody></table>`}
      <div class="card-title" style="margin-top:20px">Total Saldo Per Mata Uang</div>
      ${data.credits.balances.map(b => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:14px">
          <span>${esc(b.currency)}</span><strong>${fmtFloat(parseFloat(b.total))}</strong>
        </div>`).join('')}
    </div>
  </div>`;
}

// ─── USERS ───────────────────────────────────────────────────────────────────
async function renderUsers(el, page = 1, search = '') {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';
  const data = await api(`/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
  if (!data) return;
  const totalPages = Math.ceil(data.total / 20);
  el.innerHTML = `
  <div class="search-row">
    <input class="input" id="user-search" placeholder="Cari username / email..." value="${esc(search)}" />
    <button class="btn btn-primary" id="user-search-btn">Cari</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Username</th><th>Email</th><th>Level</th><th>Balance</th><th>Status</th><th>Terdaftar</th><th>Aksi</th></tr></thead>
      <tbody>
        ${data.users.length === 0 ? `<tr><td colspan="7"><div class="empty">Tidak ada data</div></td></tr>` :
          data.users.map(u => `
          <tr>
            <td><strong><span class="user-link" onclick="showUserHistory('${esc(u.username)}')" style="cursor:pointer;color:var(--primary);text-decoration:underline dotted">${esc(u.username)}</span></strong>${u.is_admin ? ' <span class="badge purple">Admin</span>' : ''}<br><small style="color:var(--text-muted)">${esc(u.display_name || '')}</small></td>
            <td>${esc(u.email)}<br><span class="badge ${u.email_verified ? 'green' : 'yellow'}">${u.email_verified ? 'Terverifikasi' : 'Belum'}</span></td>
            <td>Lv.${u.mig_level || 1}</td>
            <td>${u.balance != null ? fmtFloat(u.balance) + ' ' + (u.currency || '') : '-'}</td>
            <td><span class="badge ${u.is_suspended ? 'red' : 'green'}">${u.is_suspended ? 'Suspended' : 'Aktif'}</span></td>
            <td>${fmtDateTime(u.created_at)}</td>
            <td style="white-space:nowrap">
              <button class="btn btn-sm btn-outline" onclick="toggleSuspend('${u.id}', ${!u.is_suspended},'${esc(u.username)}')">${u.is_suspended ? 'Aktifkan' : 'Suspend'}</button>
              <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}','${esc(u.username)}')">Hapus</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="pagination">
    <div class="page-info">Total: ${fmtNum(data.total)} user | Halaman ${page} dari ${totalPages}</div>
    ${page > 1 ? `<button class="btn btn-outline btn-sm" id="prev-btn">← Prev</button>` : ''}
    ${page < totalPages ? `<button class="btn btn-outline btn-sm" id="next-btn">Next →</button>` : ''}
  </div>`;

  document.getElementById('user-search-btn').onclick = () => renderUsers(el, 1, document.getElementById('user-search').value);
  document.getElementById('user-search').onkeydown = (e) => { if (e.key === 'Enter') renderUsers(el, 1, document.getElementById('user-search').value); };
  if (document.getElementById('prev-btn')) document.getElementById('prev-btn').onclick = () => renderUsers(el, page - 1, search);
  if (document.getElementById('next-btn')) document.getElementById('next-btn').onclick = () => renderUsers(el, page + 1, search);

  window.toggleSuspend = async (id, suspend, username) => {
    confirm(`${suspend ? 'Suspend' : 'Aktifkan'} User`, `Yakin ${suspend ? 'suspend' : 'aktifkan'} @${username}?`, async () => {
      await api(`/users/${id}/suspend`, { method: 'PATCH', body: { isSuspended: suspend } });
      renderUsers(el, page, search);
    }, suspend);
  };
  window.deleteUser = async (id, username) => {
    confirm('Hapus User', `Yakin hapus user @${username}? Tindakan ini tidak bisa dibatalkan!`, async () => {
      await api(`/users/${id}`, { method: 'DELETE' });
      renderUsers(el, page, search);
    });
  };
}

// ─── REGISTER AKUN SPESIAL ────────────────────────────────────────────────────
function renderRegisterSpecial(el) {
  el.innerHTML = `
  <div class="card" style="max-width:560px">
    <div class="card-title">Register Akun Spesial</div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px;margin-top:-8px">
      Username bebas 1–18 karakter, akun langsung terverifikasi.
    </p>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="field-group">
        <label>Username <span style="color:var(--danger)">*</span></label>
        <input class="input" id="rs-username" placeholder="1–18 karakter bebas..." maxlength="18" />
        <span id="rs-username-count" style="font-size:11px;color:var(--text-muted)">0 / 18</span>
      </div>
      <div class="field-group">
        <label>Display Name</label>
        <input class="input" id="rs-display-name" placeholder="nama tampilan..." />
      </div>
      <div class="field-group">
        <label>Email <span style="color:var(--danger)">*</span></label>
        <input class="input" id="rs-email" type="email" placeholder="email@contoh.com" />
      </div>
      <div class="field-group">
        <label>Password <span style="color:var(--danger)">*</span></label>
        <div style="position:relative">
          <input class="input" id="rs-password" type="password" placeholder="••••••••" style="padding-right:44px" />
          <button type="button" id="rs-pw-toggle" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);font-size:16px;cursor:pointer">👁</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field-group">
          <label>Negara</label>
          <input class="input" id="rs-country" placeholder="ID, US, SG..." maxlength="3" />
          <span style="font-size:11px;color:var(--text-muted)">Kode negara (contoh: ID)</span>
        </div>
        <div class="field-group">
          <label>Gender</label>
          <select class="input" id="rs-gender">
            <option value="">— Pilih —</option>
            <option value="male">Laki-laki</option>
            <option value="female">Perempuan</option>
            <option value="other">Lainnya</option>
          </select>
        </div>
      </div>
      <div id="rs-error" style="color:var(--danger);font-size:13px;display:none"></div>
      <div id="rs-success" style="color:var(--success);font-size:13px;display:none"></div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn btn-primary" id="rs-save-btn">Buat Akun Spesial</button>
        <button class="btn btn-outline" onclick="state.page='users';render()">Batal</button>
      </div>
    </div>
  </div>`;

  const usernameInput = document.getElementById('rs-username');
  const countEl = document.getElementById('rs-username-count');
  usernameInput.oninput = () => {
    const len = usernameInput.value.length;
    countEl.textContent = `${len} / 18`;
    countEl.style.color = len > 0 && len <= 18 ? 'var(--success)' : 'var(--danger)';
  };

  document.getElementById('rs-pw-toggle').onclick = () => {
    const pw = document.getElementById('rs-password');
    pw.type = pw.type === 'password' ? 'text' : 'password';
  };

  document.getElementById('rs-save-btn').onclick = async () => {
    const errEl = document.getElementById('rs-error');
    const sucEl = document.getElementById('rs-success');
    errEl.style.display = 'none';
    sucEl.style.display = 'none';

    const username = usernameInput.value.trim();
    const displayName = document.getElementById('rs-display-name').value.trim();
    const email = document.getElementById('rs-email').value.trim();
    const password = document.getElementById('rs-password').value;
    const country = document.getElementById('rs-country').value.trim().toUpperCase();
    const gender = document.getElementById('rs-gender').value;

    if (!username) { errEl.textContent = 'Username wajib diisi'; errEl.style.display = 'block'; return; }
    if (username.length > 18) { errEl.textContent = 'Username maksimal 18 karakter'; errEl.style.display = 'block'; return; }
    if (!email) { errEl.textContent = 'Email wajib diisi'; errEl.style.display = 'block'; return; }
    if (!password) { errEl.textContent = 'Password wajib diisi'; errEl.style.display = 'block'; return; }

    const btn = document.getElementById('rs-save-btn');
    btn.textContent = 'Membuat akun...'; btn.disabled = true;

    const res = await api('/users/special', {
      method: 'POST',
      body: { username, displayName, email, password, country: country || null, gender: gender || null },
    });
    btn.textContent = 'Buat Akun Spesial'; btn.disabled = false;

    if (!res || res.error) {
      errEl.textContent = res?.error || 'Gagal membuat akun';
      errEl.style.display = 'block';
      return;
    }

    sucEl.textContent = `Akun @${res.user.username} berhasil dibuat!`;
    sucEl.style.display = 'block';
    usernameInput.value = '';
    document.getElementById('rs-display-name').value = '';
    document.getElementById('rs-email').value = '';
    document.getElementById('rs-password').value = '';
    document.getElementById('rs-country').value = '';
    document.getElementById('rs-gender').value = '';
    countEl.textContent = '0 / 18';
    countEl.style.color = 'var(--text-muted)';
  };
}

// ─── CHATROOMS ────────────────────────────────────────────────────────────────
function openCreateRoomModal() {
  document.getElementById('crm-name').value = '';
  document.getElementById('crm-desc').value = '';
  document.getElementById('crm-category').value = '8';
  document.getElementById('crm-capacity').value = '25';
  document.getElementById('crm-language').value = 'id';
  document.getElementById('crm-type').value = 'official';
  document.getElementById('crm-color').value = '#4CAF50';
  document.getElementById('crm-color-picker').value = '#4CAF50';
  document.getElementById('crm-owner').value = '';
  document.getElementById('crm-adult').checked = false;
  document.getElementById('crm-allow-kick').checked = true;
  document.getElementById('create-room-modal').classList.add('open');
  setTimeout(() => document.getElementById('crm-name').focus(), 100);
}

window.closeCreateRoomModal = () => {
  document.getElementById('create-room-modal').classList.remove('open');
};

window.saveCreateRoom = async () => {
  const name      = document.getElementById('crm-name').value.trim();
  const desc      = document.getElementById('crm-desc').value.trim();
  const category  = document.getElementById('crm-category').value;
  const capacity  = document.getElementById('crm-capacity').value;
  const language  = document.getElementById('crm-language').value;
  const typeVal   = document.getElementById('crm-type').value;
  const color     = document.getElementById('crm-color').value.trim() || '#4CAF50';
  const owner     = document.getElementById('crm-owner').value.trim();
  const adult     = document.getElementById('crm-adult').checked;
  const allowKick = document.getElementById('crm-allow-kick').checked;

  if (!name) { toast('Nama room wajib diisi', 'error'); document.getElementById('crm-name').focus(); return; }
  if (!category) { toast('Kategori wajib dipilih', 'error'); return; }

  const btn = document.getElementById('crm-save-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Membuat...';

  const res = await api('/chatrooms', {
    method: 'POST',
    body: {
      name, description: desc || null,
      category_id: parseInt(category),
      max_participants: parseInt(capacity) || 25,
      language, color,
      allow_kick: allowKick,
      adult_only: adult,
      user_owned: typeVal === 'user',
      owner: owner || null,
    },
  });

  btn.disabled = false;
  btn.textContent = '🏠 Buat Room';

  if (res && res.success) {
    toast(res.message || 'Chatroom berhasil dibuat', 'success');
    closeCreateRoomModal();
    if (window._refreshRooms) window._refreshRooms();
  } else {
    toast(res?.error || 'Gagal membuat chatroom', 'error');
  }
};

let _editRoomData = null;
let _editRoomRefresh = null;

function openEditRoomModal(room, refreshFn) {
  _editRoomData = room;
  _editRoomRefresh = refreshFn;
  document.getElementById('erm-room-name').textContent = room.name;
  document.getElementById('erm-capacity').value = room.max_participants || 25;
  document.getElementById('erm-category').value = String(room.category_id || 1);
  document.getElementById('erm-owner').value = '';
  document.getElementById('edit-room-modal').classList.add('open');
}

window.closeEditRoomModal = () => {
  document.getElementById('edit-room-modal').classList.remove('open');
  _editRoomData = null;
};

window.saveEditRoom = async () => {
  if (!_editRoomData) return;
  const capacity = parseInt(document.getElementById('erm-capacity').value);
  const category = parseInt(document.getElementById('erm-category').value);
  const ownerInput = document.getElementById('erm-owner').value.trim();

  if (isNaN(capacity) || capacity < 2) {
    toast('Kapasitas minimal 2', 'error'); return;
  }

  const btn = document.getElementById('erm-save-btn');
  btn.disabled = true;
  btn.textContent = '⏳ Menyimpan...';

  const payload = {
    max_participants: capacity,
    category_id: category,
  };
  if (ownerInput !== '') payload.created_by = ownerInput;

  const res = await api(`/chatrooms/${_editRoomData.id}`, { method: 'PUT', body: payload });
  btn.disabled = false;
  btn.textContent = '💾 Simpan Perubahan';

  if (res && res.success) {
    toast(res.message || 'Chatroom berhasil diperbarui', 'success');
    closeEditRoomModal();
    if (_editRoomRefresh) _editRoomRefresh();
  } else {
    toast(res?.error || 'Gagal memperbarui chatroom', 'error');
  }
};

async function renderChatrooms(el, page = 1, search = '') {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';
  const data = await api(`/chatrooms?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
  if (!data) return;
  const totalPages = Math.ceil(data.total / 20);

  const CATEGORIES = {1:'General',2:'Social',3:'Entertainment',4:'Friends',5:'Business',6:'Help',7:'Games',8:'Regional',9:'Music',10:'News'};

  el.innerHTML = `
  <div class="search-row">
    <input class="input" id="room-search" placeholder="Cari nama chatroom..." value="${esc(search)}" />
    <button class="btn btn-primary" id="room-search-btn">Cari</button>
    <button class="btn btn-primary" onclick="openCreateRoomModal()" style="margin-left:auto;white-space:nowrap">🏠 Buat Room</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Nama</th><th>Peserta</th><th>Kategori</th><th>Tipe</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead>
      <tbody>
        ${data.chatrooms.length === 0 ? `<tr><td colspan="7"><div class="empty">Tidak ada chatroom</div></td></tr>` :
          data.chatrooms.map(c => `
          <tr>
            <td><strong>${esc(c.name)}</strong><br><small style="color:var(--text-muted)">${esc(c.description || '-')}</small></td>
            <td>${c.current_participants}/${c.max_participants}</td>
            <td><span class="badge gray">${esc(CATEGORIES[c.category_id] || String(c.category_id))}</span>${c.adult_only ? ' <span class="badge red">18+</span>' : ''}</td>
            <td><span class="badge ${c.user_owned ? 'blue' : 'purple'}">${c.user_owned ? 'User' : 'Official'}</span></td>
            <td><span class="badge ${c.status === 1 ? 'green' : 'red'}">${c.status === 1 ? 'Aktif' : 'Nonaktif'}</span></td>
            <td>${fmtDateTime(c.created_at)}</td>
            <td>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                <button class="btn btn-sm btn-outline" onclick="openEditRoomModal(${JSON.stringify(c).replace(/"/g,'&quot;')}, _refreshRooms)" title="Edit">✏️ Edit</button>
                <button class="btn btn-sm btn-outline" onclick="toggleRoom('${c.id}',${c.status === 1 ? 0 : 1})">${c.status === 1 ? 'Nonaktifkan' : 'Aktifkan'}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteRoom('${c.id}','${esc(c.name)}')">Hapus</button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="pagination">
    <div class="page-info">Total: ${fmtNum(data.total)} | Halaman ${page} dari ${totalPages}</div>
    ${page > 1 ? `<button class="btn btn-outline btn-sm" id="prev-btn">← Prev</button>` : ''}
    ${page < totalPages ? `<button class="btn btn-outline btn-sm" id="next-btn">Next →</button>` : ''}
  </div>`;

  window._refreshRooms = () => renderChatrooms(el, page, search);
  document.getElementById('room-search-btn').onclick = () => renderChatrooms(el, 1, document.getElementById('room-search').value);
  document.getElementById('room-search').onkeydown = (e) => { if (e.key === 'Enter') renderChatrooms(el, 1, document.getElementById('room-search').value); };
  if (document.getElementById('prev-btn')) document.getElementById('prev-btn').onclick = () => renderChatrooms(el, page - 1, search);
  if (document.getElementById('next-btn')) document.getElementById('next-btn').onclick = () => renderChatrooms(el, page + 1, search);

  window.toggleRoom = async (id, status) => {
    await api(`/chatrooms/${id}/status`, { method: 'PATCH', body: { status } });
    renderChatrooms(el, page, search);
  };
  window.deleteRoom = async (id, name) => {
    confirm('Hapus Chatroom', `Yakin hapus chatroom "${name}"?`, async () => {
      await api(`/chatrooms/${id}`, { method: 'DELETE' });
      renderChatrooms(el, page, search);
    });
  };
}

// ─── CREDITS ─────────────────────────────────────────────────────────────────
const TX_TYPES = {1:'Credit Card',2:'Voucher',3:'SMS',4:'Call',5:'Subscription',6:'Purchase',7:'Referral',8:'Activation',9:'Bonus',10:'Refund',14:'Transfer',17:'Voucher Created',23:'Kick Charge',33:'Game Bet',34:'Game Reward',41:'Virtual Gift',};

async function renderCredits(el, page = 1, search = '') {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';
  const data = await api(`/credits/accounts?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
  if (!data) return;
  const totalPages = Math.ceil(data.total / 20);
  el.innerHTML = `
  <div class="search-row">
    <input class="input" id="credit-search" placeholder="Cari username..." value="${esc(search)}" />
    <button class="btn btn-primary" id="credit-search-btn">Cari</button>
    <button class="btn btn-outline" id="show-tx-btn">Lihat Transaksi Terbaru</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Username</th><th>Mata Uang</th><th>Balance</th><th>Funded Balance</th><th>Update Terakhir</th></tr></thead>
      <tbody>
        ${data.accounts.length === 0 ? `<tr><td colspan="5"><div class="empty">Tidak ada data</div></td></tr>` :
          data.accounts.map(a => `
          <tr>
            <td><strong>${esc(a.username)}</strong></td>
            <td>${esc(a.currency)}</td>
            <td><strong>${fmtFloat(a.balance)}</strong></td>
            <td>${fmtFloat(a.funded_balance)}</td>
            <td>${fmtDateTime(a.updated_at)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="pagination">
    <div class="page-info">Total: ${fmtNum(data.total)} akun | Halaman ${page} dari ${totalPages}</div>
    ${page > 1 ? `<button class="btn btn-outline btn-sm" id="prev-btn">← Prev</button>` : ''}
    ${page < totalPages ? `<button class="btn btn-outline btn-sm" id="next-btn">Next →</button>` : ''}
  </div>
  <div id="tx-section"></div>`;

  document.getElementById('credit-search-btn').onclick = () => renderCredits(el, 1, document.getElementById('credit-search').value);
  document.getElementById('credit-search').onkeydown = (e) => { if (e.key === 'Enter') renderCredits(el, 1, document.getElementById('credit-search').value); };
  if (document.getElementById('prev-btn')) document.getElementById('prev-btn').onclick = () => renderCredits(el, page - 1, search);
  if (document.getElementById('next-btn')) document.getElementById('next-btn').onclick = () => renderCredits(el, page + 1, search);

  document.getElementById('show-tx-btn').onclick = async () => {
    const tx = await api('/credits/transactions?page=1&limit=30');
    const txEl = document.getElementById('tx-section');
    txEl.innerHTML = `<br><div class="card">
      <div class="card-title">Transaksi Terbaru</div>
      <div class="table-wrap">
      <table>
        <thead><tr><th>Username</th><th>Tipe</th><th>Jumlah</th><th>Keterangan</th><th>Waktu</th></tr></thead>
        <tbody>
          ${tx.transactions.map(t => `
          <tr>
            <td>${esc(t.username)}</td>
            <td><span class="badge ${t.amount > 0 ? 'green' : 'red'}">${TX_TYPES[t.type] || 'Tipe '+t.type}</span></td>
            <td style="font-weight:600;color:${t.amount > 0 ? 'var(--success)' : 'var(--danger)'}">${t.amount > 0 ? '+' : ''}${fmtFloat(t.amount)} ${t.currency}</td>
            <td>${esc(t.description || '-')}</td>
            <td>${fmtDateTime(t.created_at)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div></div>`;
  };
}

// ─── MANAJEMEN KREDIT ─────────────────────────────────────────────────────────
function renderCreditManagement(el) {
  el.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:24px;max-width:680px">

    <div class="card">
      <div class="card-title">Tambah Kredit ke User Tertentu</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px;margin-top:-8px">
        Tambahkan sejumlah kredit langsung ke akun user yang dituju.
      </p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="field-group">
          <label>Username <span style="color:var(--danger)">*</span></label>
          <input class="input" id="cm-username" placeholder="Masukkan username..." />
        </div>
        <div class="field-group">
          <label>Jumlah Kredit <span style="color:var(--danger)">*</span></label>
          <input class="input" id="cm-amount" type="number" min="1" step="any" placeholder="Contoh: 1000" />
        </div>
        <div class="field-group">
          <label>Mata Uang</label>
          <select class="input" id="cm-currency">
            <option value="">Gunakan mata uang akun user</option>
            <option value="IDR">IDR</option>
            <option value="MIG">MIG</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div class="field-group">
          <label>Keterangan</label>
          <input class="input" id="cm-description" placeholder="Keterangan transaksi (opsional)..." />
        </div>
        <div id="cm-result" style="display:none;padding:12px;border-radius:8px;font-size:13px"></div>
        <div>
          <button class="btn btn-primary" id="cm-add-btn">Tambah Kredit</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Transfer Kredit ke Semua User</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px;margin-top:-8px">
        Tambahkan kredit secara massal ke seluruh akun yang terdaftar di sistem.
      </p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="field-group">
          <label>Jumlah Kredit per User <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ca-amount" type="number" min="1" step="any" placeholder="Contoh: 500" />
        </div>
        <div class="field-group">
          <label>Mata Uang</label>
          <select class="input" id="ca-currency">
            <option value="">Gunakan mata uang masing-masing akun</option>
            <option value="IDR">IDR</option>
            <option value="MIG">MIG</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div class="field-group">
          <label>Keterangan</label>
          <input class="input" id="ca-description" placeholder="Keterangan transaksi (opsional)..." />
        </div>
        <div id="ca-result" style="display:none;padding:12px;border-radius:8px;font-size:13px"></div>
        <div>
          <button class="btn btn-danger" id="ca-add-btn">Transfer ke Semua User</button>
        </div>
      </div>
    </div>

  </div>`;

  document.getElementById('cm-add-btn').onclick = async () => {
    const btn = document.getElementById('cm-add-btn');
    const resultEl = document.getElementById('cm-result');
    const username = document.getElementById('cm-username').value.trim();
    const amount = parseFloat(document.getElementById('cm-amount').value);
    const currency = document.getElementById('cm-currency').value || undefined;
    const description = document.getElementById('cm-description').value.trim() || undefined;

    resultEl.style.display = 'none';
    if (!username) { toast('Username wajib diisi', 'error'); return; }
    if (isNaN(amount) || amount <= 0) { toast('Jumlah kredit harus lebih dari 0', 'error'); return; }

    btn.textContent = 'Memproses...'; btn.disabled = true;
    const body = { username, amount };
    if (currency) body.currency = currency;
    if (description) body.description = description;

    const res = await api('/credits/add', { method: 'POST', body });
    btn.textContent = 'Tambah Kredit'; btn.disabled = false;

    if (!res || res.error) {
      resultEl.style.cssText = 'display:block;padding:12px;border-radius:8px;font-size:13px;background:var(--danger-light,#fee);color:var(--danger);border:1px solid var(--danger)';
      resultEl.textContent = '✗ ' + (res?.error || 'Gagal menambah kredit');
      return;
    }
    resultEl.style.cssText = 'display:block;padding:12px;border-radius:8px;font-size:13px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0';
    resultEl.textContent = `✓ Berhasil menambah ${fmtFloat(res.added)} ${res.currency} ke @${res.username}. Saldo baru: ${fmtFloat(res.newBalance)} ${res.currency}`;
    toast(`Kredit berhasil ditambahkan ke @${res.username}`, 'success');
    document.getElementById('cm-username').value = '';
    document.getElementById('cm-amount').value = '';
    document.getElementById('cm-description').value = '';
  };

  document.getElementById('ca-add-btn').onclick = () => {
    const amount = parseFloat(document.getElementById('ca-amount').value);
    if (isNaN(amount) || amount <= 0) { toast('Jumlah kredit harus lebih dari 0', 'error'); return; }

    confirm(
      'Transfer ke Semua User',
      `Yakin ingin menambah ${fmtFloat(amount)} kredit ke SEMUA user? Tindakan ini tidak bisa dibatalkan.`,
      async () => {
        const btn = document.getElementById('ca-add-btn');
        const resultEl = document.getElementById('ca-result');
        const currency = document.getElementById('ca-currency').value || undefined;
        const description = document.getElementById('ca-description').value.trim() || undefined;

        btn.textContent = 'Memproses...'; btn.disabled = true;
        resultEl.style.display = 'none';

        const body = { amount };
        if (currency) body.currency = currency;
        if (description) body.description = description;

        const res = await api('/credits/transfer-all', { method: 'POST', body });
        btn.textContent = 'Transfer ke Semua User'; btn.disabled = false;

        if (!res || res.error) {
          resultEl.style.cssText = 'display:block;padding:12px;border-radius:8px;font-size:13px;background:var(--danger-light,#fee);color:var(--danger);border:1px solid var(--danger)';
          resultEl.textContent = '✗ ' + (res?.error || 'Gagal melakukan transfer');
          return;
        }
        resultEl.style.cssText = 'display:block;padding:12px;border-radius:8px;font-size:13px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0';
        resultEl.textContent = `✓ Transfer selesai! ${fmtNum(res.successCount)} dari ${fmtNum(res.totalProcessed)} user berhasil menerima ${fmtFloat(res.amount)} kredit.${res.failCount > 0 ? ` (${res.failCount} gagal)` : ''}`;
        toast(`Transfer massal selesai: ${res.successCount} user berhasil`, 'success');
        document.getElementById('ca-amount').value = '';
        document.getElementById('ca-description').value = '';
      },
      true
    );
  };
}

// ─── MANAGED ACCOUNT ──────────────────────────────────────────────────────────
function renderManagedAccount(el) {
  el.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:24px;max-width:680px">

    <div class="card" style="border:2px solid var(--primary,#6366f1)">
      <div class="card-title">🔍 Cari User</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px;margin-top:-8px">
        Masukkan username untuk melihat info akun dan mengisi otomatis form di bawah.
      </p>
      <div style="display:flex;gap:10px;align-items:flex-start">
        <input class="input" id="ma-lookup-input" placeholder="Ketik username lalu tekan Enter atau klik Cari..." style="flex:1" />
        <button class="btn btn-primary" id="ma-lookup-btn" style="white-space:nowrap">Cari</button>
      </div>
      <div id="ma-lookup-result" style="display:none;margin-top:16px;padding:14px;border-radius:10px;background:var(--bg,#f8f9fa);border:1px solid var(--border)"></div>
    </div>

    <div class="card">
      <div class="card-title">🔑 Change Password</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px;margin-top:-8px">Ubah password login akun user.</p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="field-group">
          <label>Username <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ma-pw-username" placeholder="Masukkan username..." />
        </div>
        <div class="field-group">
          <label>Password Baru <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ma-pw-new" type="password" placeholder="Minimal 6 karakter..." />
        </div>
        <div class="field-group">
          <label>Konfirmasi Password Baru <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ma-pw-confirm" type="password" placeholder="Ulangi password baru..." />
        </div>
        <div id="ma-pw-result" style="display:none;padding:12px;border-radius:8px;font-size:13px"></div>
        <div><button class="btn btn-primary" id="ma-pw-btn">Ubah Password</button></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">🔢 Change PIN</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px;margin-top:-8px">Ubah PIN transfer kredit user (4–6 digit angka).</p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="field-group">
          <label>Username <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ma-pin-username" placeholder="Masukkan username..." />
        </div>
        <div class="field-group">
          <label>PIN Baru <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ma-pin-new" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="4–6 digit angka..." />
        </div>
        <div class="field-group">
          <label>Konfirmasi PIN Baru <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ma-pin-confirm" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="Ulangi PIN baru..." />
        </div>
        <div id="ma-pin-result" style="display:none;padding:12px;border-radius:8px;font-size:13px"></div>
        <div><button class="btn btn-primary" id="ma-pin-btn">Ubah PIN</button></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">✉️ Change Email</div>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:18px;margin-top:-8px">Ubah alamat email akun user. Email baru langsung ditandai terverifikasi.</p>
      <div style="display:flex;flex-direction:column;gap:14px">
        <div class="field-group">
          <label>Username <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ma-em-username" placeholder="Masukkan username..." />
        </div>
        <div class="field-group">
          <label>Email Saat Ini</label>
          <input class="input" id="ma-em-current" placeholder="(belum dicari)" disabled style="opacity:0.6" />
        </div>
        <div class="field-group">
          <label>Email Baru <span style="color:var(--danger)">*</span></label>
          <input class="input" id="ma-em-new" type="email" placeholder="contoh@email.com" />
        </div>
        <div id="ma-em-result" style="display:none;padding:12px;border-radius:8px;font-size:13px"></div>
        <div><button class="btn btn-primary" id="ma-em-btn">Ubah Email</button></div>
      </div>
    </div>

  </div>`;

  function showResult(id, ok, msg) {
    const r = document.getElementById(id);
    r.style.cssText = ok
      ? 'display:block;padding:12px;border-radius:8px;font-size:13px;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0'
      : 'display:block;padding:12px;border-radius:8px;font-size:13px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca';
    r.textContent = (ok ? '✓ ' : '✗ ') + msg;
  }

  function fillForms(username) {
    ['ma-pw-username', 'ma-pin-username', 'ma-em-username'].forEach(id => {
      document.getElementById(id).value = username;
    });
  }

  function renderLookupCard(u) {
    const statusBadge = u.is_suspended
      ? '<span class="badge red">Suspended</span>'
      : '<span class="badge green">Aktif</span>';
    const adminBadge = u.is_admin ? '<span class="badge purple">Admin</span>' : '';
    const verifiedBadge = u.email_verified
      ? '<span class="badge green">Terverifikasi</span>'
      : '<span class="badge yellow">Belum Verifikasi</span>';
    const pinBadge = u.has_pin
      ? '<span class="badge blue">PIN Terset</span>'
      : '<span class="badge gray">Belum ada PIN</span>';

    return `
    <div style="display:grid;grid-template-columns:auto 1fr;gap:10px 16px;align-items:center;font-size:13px">
      <div style="grid-column:1/-1;display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--primary,#6366f1);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;font-weight:700;flex-shrink:0">
          ${u.display_picture ? `<img src="${esc(u.display_picture)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover" onerror="this.style.display='none'" />` : esc((u.username||'?')[0].toUpperCase())}
        </div>
        <div>
          <div style="font-weight:700;font-size:15px">${esc(u.username)}</div>
          <div style="color:var(--text-muted)">${esc(u.display_name || '')}</div>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">${statusBadge}${adminBadge}</div>
      </div>
      <span style="color:var(--text-muted)">Email</span>
      <span><strong>${esc(u.email)}</strong> ${verifiedBadge}</span>
      <span style="color:var(--text-muted)">Level</span>
      <span>Level ${u.mig_level || 1}${u.country ? ' · ' + esc(u.country) : ''}</span>
      <span style="color:var(--text-muted)">Balance</span>
      <span>${u.balance != null ? '<strong>' + fmtFloat(u.balance) + '</strong> ' + esc(u.currency || '') : '-'}</span>
      <span style="color:var(--text-muted)">Transfer PIN</span>
      <span>${pinBadge}</span>
      <span style="color:var(--text-muted)">Terdaftar</span>
      <span>${fmtDateTime(u.created_at)}</span>
      <div style="grid-column:1/-1;margin-top:10px">
        <button class="btn btn-primary btn-sm" id="ma-autofill-btn">↓ Isi Otomatis Username ke Semua Form</button>
      </div>
    </div>`;
  }

  const doLookup = async () => {
    const username = document.getElementById('ma-lookup-input').value.trim();
    const resultEl = document.getElementById('ma-lookup-result');
    const btn = document.getElementById('ma-lookup-btn');
    if (!username) { toast('Masukkan username terlebih dahulu', 'error'); return; }

    btn.textContent = 'Mencari...'; btn.disabled = true;
    resultEl.style.display = 'none';

    const res = await api(`/accounts/lookup?username=${encodeURIComponent(username)}`);
    btn.textContent = 'Cari'; btn.disabled = false;

    if (!res || res.error) {
      resultEl.style.cssText = 'display:block;margin-top:16px;padding:12px;border-radius:8px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;font-size:13px';
      resultEl.textContent = '✗ ' + (res?.error || 'User tidak ditemukan');
      return;
    }

    const u = res.user;
    resultEl.style.cssText = 'display:block;margin-top:16px;padding:14px;border-radius:10px;background:var(--bg,#f8f9fa);border:1px solid var(--border)';
    resultEl.innerHTML = renderLookupCard(u);

    document.getElementById('ma-em-current').value = u.email || '';

    document.getElementById('ma-autofill-btn').onclick = () => {
      fillForms(u.username);
      document.getElementById('ma-em-current').value = u.email || '';
      toast(`Username @${u.username} diisi ke semua form`, 'success');
    };
  };

  document.getElementById('ma-lookup-btn').onclick = doLookup;
  document.getElementById('ma-lookup-input').onkeydown = (e) => { if (e.key === 'Enter') doLookup(); };

  document.getElementById('ma-pw-btn').onclick = async () => {
    const btn = document.getElementById('ma-pw-btn');
    const username = document.getElementById('ma-pw-username').value.trim();
    const newPassword = document.getElementById('ma-pw-new').value;
    const confirmPassword = document.getElementById('ma-pw-confirm').value;

    document.getElementById('ma-pw-result').style.display = 'none';
    if (!username) { showResult('ma-pw-result', false, 'Username wajib diisi'); return; }
    if (!newPassword || newPassword.length < 6) { showResult('ma-pw-result', false, 'Password minimal 6 karakter'); return; }
    if (newPassword !== confirmPassword) { showResult('ma-pw-result', false, 'Konfirmasi password tidak cocok'); return; }

    btn.textContent = 'Memproses...'; btn.disabled = true;
    const res = await api('/accounts/change-password', { method: 'PATCH', body: { username, newPassword } });
    btn.textContent = 'Ubah Password'; btn.disabled = false;

    if (!res || res.error) { showResult('ma-pw-result', false, res?.error || 'Gagal mengubah password'); return; }
    showResult('ma-pw-result', true, res.message || 'Password berhasil diubah');
    toast(`Password @${username} berhasil diubah`, 'success');
    document.getElementById('ma-pw-new').value = '';
    document.getElementById('ma-pw-confirm').value = '';
  };

  document.getElementById('ma-pin-btn').onclick = async () => {
    const btn = document.getElementById('ma-pin-btn');
    const username = document.getElementById('ma-pin-username').value.trim();
    const newPin = document.getElementById('ma-pin-new').value;
    const confirmPin = document.getElementById('ma-pin-confirm').value;

    document.getElementById('ma-pin-result').style.display = 'none';
    if (!username) { showResult('ma-pin-result', false, 'Username wajib diisi'); return; }
    if (!/^\d{4,6}$/.test(newPin)) { showResult('ma-pin-result', false, 'PIN harus 4–6 digit angka'); return; }
    if (newPin !== confirmPin) { showResult('ma-pin-result', false, 'Konfirmasi PIN tidak cocok'); return; }

    btn.textContent = 'Memproses...'; btn.disabled = true;
    const res = await api('/accounts/change-pin', { method: 'PATCH', body: { username, newPin } });
    btn.textContent = 'Ubah PIN'; btn.disabled = false;

    if (!res || res.error) { showResult('ma-pin-result', false, res?.error || 'Gagal mengubah PIN'); return; }
    showResult('ma-pin-result', true, res.message || 'PIN berhasil diubah');
    toast(`PIN @${username} berhasil diubah`, 'success');
    document.getElementById('ma-pin-new').value = '';
    document.getElementById('ma-pin-confirm').value = '';
  };

  document.getElementById('ma-em-btn').onclick = async () => {
    const btn = document.getElementById('ma-em-btn');
    const username = document.getElementById('ma-em-username').value.trim();
    const newEmail = document.getElementById('ma-em-new').value.trim();

    document.getElementById('ma-em-result').style.display = 'none';
    if (!username) { showResult('ma-em-result', false, 'Username wajib diisi'); return; }
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { showResult('ma-em-result', false, 'Format email tidak valid'); return; }

    btn.textContent = 'Memproses...'; btn.disabled = true;
    const res = await api('/accounts/change-email', { method: 'PATCH', body: { username, newEmail } });
    btn.textContent = 'Ubah Email'; btn.disabled = false;

    if (!res || res.error) { showResult('ma-em-result', false, res?.error || 'Gagal mengubah email'); return; }
    showResult('ma-em-result', true, `${res.message || 'Email berhasil diubah'} → ${res.newEmail}`);
    toast(`Email @${username} berhasil diubah`, 'success');
    document.getElementById('ma-em-current').value = res.newEmail || '';
    document.getElementById('ma-em-new').value = '';
  };
}

// ─── VOUCHERS ────────────────────────────────────────────────────────────────
const VOUCHER_STATUS = {0:'Inactive',1:'Active',2:'Cancelled',3:'Redeemed',4:'Expired',5:'Failed'};
const VOUCHER_BADGE = {0:'gray',1:'green',2:'red',3:'blue',4:'yellow',5:'red'};

async function renderVouchers(el, page = 1) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';
  const data = await api(`/credits/vouchers?page=${page}&limit=20`);
  if (!data) return;
  const totalPages = Math.ceil(data.total / 20);
  el.innerHTML = `
  <div class="table-wrap">
    <table>
      <thead><tr><th>Kode</th><th>Jumlah</th><th>Status</th><th>Diredeem Oleh</th><th>Batch Creator</th><th>Kadaluarsa</th></tr></thead>
      <tbody>
        ${data.vouchers.length === 0 ? `<tr><td colspan="6"><div class="empty">Tidak ada voucher</div></td></tr>` :
          data.vouchers.map(v => `
          <tr>
            <td><code style="font-size:12px;background:var(--bg);padding:2px 6px;border-radius:4px">${esc(v.code)}</code></td>
            <td><strong>${fmtFloat(v.amount)}</strong> ${esc(v.currency)}</td>
            <td><span class="badge ${VOUCHER_BADGE[v.status] || 'gray'}">${VOUCHER_STATUS[v.status] || v.status}</span></td>
            <td>${esc(v.redeemed_by_username || '-')}</td>
            <td>${esc(v.batch_creator || '-')}</td>
            <td>${v.expiry_date ? fmtDateTime(v.expiry_date) : 'Tidak ada'}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="pagination">
    <div class="page-info">Total: ${fmtNum(data.total)} voucher | Halaman ${page} dari ${totalPages}</div>
    ${page > 1 ? `<button class="btn btn-outline btn-sm" id="prev-btn">← Prev</button>` : ''}
    ${page < totalPages ? `<button class="btn btn-outline btn-sm" id="next-btn">Next →</button>` : ''}
  </div>`;
  if (document.getElementById('prev-btn')) document.getElementById('prev-btn').onclick = () => renderVouchers(el, page - 1);
  if (document.getElementById('next-btn')) document.getElementById('next-btn').onclick = () => renderVouchers(el, page + 1);
}

// ─── GIFTS ────────────────────────────────────────────────────────────────────
let giftsData = [];
let giftCategories = [];
let currentGiftId = null;
let currentGiftFilter = 'all';
let giftContentEl = null;

const CAT_NAMES = {
  1: 'Standar', 2: 'Premium / VIP', 3: 'Spesial', 4: 'Seasonal', 5: 'Event',
};

function catName(id) { return CAT_NAMES[id] || `Grup ${id}`; }

async function renderGifts(el) {
  giftContentEl = el;
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat gifts...</div>';
  const data = await api('/gifts');
  if (!data) return;
  giftsData = data.gifts || [];
  giftCategories = data.categories || [];
  drawGiftPage();
}

function drawGiftPage() {
  const el = giftContentEl;
  const groups = ['all', ...giftCategories.map(c => String(c.group_id))];
  const filtered = currentGiftFilter === 'all' ? giftsData : giftsData.filter(g => String(g.group_id) === currentGiftFilter);

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div>
      <h2 style="font-size:16px;font-weight:600">Virtual Gifts</h2>
      <p style="font-size:13px;color:var(--text-muted)">${fmtNum(giftsData.length)} gift terdaftar</p>
    </div>
    <button class="btn btn-primary" onclick="openGiftModal(null)">＋ Tambah Gift</button>
  </div>
  <div class="cat-tabs">
    <div class="cat-tab${currentGiftFilter === 'all' ? ' active' : ''}" onclick="filterGifts('all')">
      Semua <span style="opacity:0.7">(${giftsData.length})</span>
    </div>
    ${giftCategories.map(c => `
      <div class="cat-tab${currentGiftFilter === String(c.group_id) ? ' active' : ''}" onclick="filterGifts('${c.group_id}')">
        ${catName(c.group_id)} <span style="opacity:0.7">(${c.count})</span>
      </div>`).join('')}
    <button class="btn btn-outline btn-sm" onclick="openNewCatPrompt()" style="margin-left:auto">+ Kategori Baru</button>
  </div>
  <div class="gift-grid" id="gift-grid">
    ${filtered.length === 0 ? '<div class="empty" style="grid-column:1/-1">Belum ada gift di kategori ini</div>' :
      filtered.map(g => renderGiftCard(g)).join('')}
  </div>`;

  window.filterGifts = (gid) => { currentGiftFilter = gid; drawGiftPage(); };
  window.openNewCatPrompt = () => {
    const id = window.prompt('Masukkan nomor ID kategori baru (misal: 3, 4, 5):');
    if (!id || isNaN(parseInt(id))) return;
    openGiftModal(null, parseInt(id));
  };
}

function renderGiftCard(g) {
  const hasImg = !!g.location_64x64_png;
  const imgEl = hasImg
    ? `<img src="${esc(g.location_64x64_png)}?t=${Date.now()}" alt="${esc(g.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span class="gift-emoji" style="display:none">${esc(g.hot_key || '🎁')}</span>`
    : `<span class="gift-emoji">${esc(g.hot_key || '🎁')}</span>`;

  return `
  <div class="gift-card" id="gcard-${g.id}">
    ${g.group_vip_only ? '<div class="vip-ribbon">VIP</div>' : ''}
    <div class="gift-img-wrap">${imgEl}</div>
    ${hasImg ? `<span class="has-img-badge">✓ ImageKit CDN</span>` : `<span class="no-img-badge">Belum ada gambar</span>`}
    <div class="gift-name">${esc(g.name)}</div>
    <div class="gift-price">${fmtFloat(g.price)} ${esc(g.currency || 'MIG')}</div>
    <div style="margin-bottom:6px">
      <span class="badge ${g.status === 1 ? 'green' : 'gray'}" style="font-size:10px">${g.status === 1 ? 'Aktif' : 'Nonaktif'}</span>
      <span class="badge blue" style="font-size:10px">${catName(g.group_id)}</span>
    </div>
    <div class="gift-actions">
      <button class="btn btn-sm btn-outline" onclick="openGiftModal(${g.id})">✏️ Edit</button>
      <button class="btn btn-sm btn-danger" onclick="deleteGift(${g.id},'${esc(g.name)}')">🗑️</button>
    </div>
  </div>`;
}

// ── Gift Modal ────────────────────────────────────────────────────────────────
let pendingUploadFile = null;

async function openGiftModal(giftId, defaultGroupId = 1) {
  currentGiftId = giftId;
  const modal = document.getElementById('gift-modal');
  const title = document.getElementById('gm-title');
  title.textContent = giftId ? 'Edit Gift' : 'Tambah Gift Baru';

  // Build category options from existing categories + add new ones
  const catOpts = [...new Set([...giftCategories.map(c => c.group_id), 1, 2, 3, 4, 5, defaultGroupId])]
    .sort((a, b) => a - b)
    .map(id => `<option value="${id}">${catName(id)} (Grup ${id})</option>`)
    .join('');
  document.getElementById('gm-group').innerHTML = catOpts;

  // Reset form
  resetGiftForm();

  if (giftId) {
    const g = giftsData.find(x => x.id === giftId);
    if (g) fillGiftForm(g);
  } else {
    document.getElementById('gm-group').value = defaultGroupId;
  }

  // Set up file input
  const fileInput = document.getElementById('gm-file');
  fileInput.value = '';
  pendingUploadFile = null;
  fileInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file) previewGiftFile(file);
  };

  // Set up drag & drop
  const zone = document.getElementById('gm-upload-zone');
  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('drag-over'); };
  zone.ondragleave = () => zone.classList.remove('drag-over');
  zone.ondrop = (e) => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) previewGiftFile(file);
  };

  // Delete image btn
  document.getElementById('gm-del-img-btn').onclick = async () => {
    if (!currentGiftId) return;
    confirm('Hapus Gambar', `Yakin hapus gambar gift ini?`, async () => {
      const res = await api(`/gifts/${currentGiftId}/image`, { method: 'DELETE' });
      if (res?.success) {
        toast('Gambar berhasil dihapus', 'success');
        const g = giftsData.find(x => x.id === currentGiftId);
        if (g) { g.location_64x64_png = null; g.location_16x16_png = null; }
        updatePreview(null, document.getElementById('gm-hotkey').value || '🎁');
        document.getElementById('gm-current-img').style.display = 'none';
        drawGiftPage();
      }
    });
  };

  modal.classList.add('open');
}

window.closeGiftModal = () => {
  document.getElementById('gift-modal').classList.remove('open');
  currentGiftId = null;
  pendingUploadFile = null;
};

function resetGiftForm() {
  document.getElementById('gm-name').value = '';
  document.getElementById('gm-hotkey').value = '';
  document.getElementById('gm-price').value = '10';
  document.getElementById('gm-currency').value = 'MIG';
  document.getElementById('gm-sort').value = '';
  document.getElementById('gm-available').value = '';
  document.getElementById('gm-msg').value = '';
  document.getElementById('gm-vip').checked = false;
  document.getElementById('gm-status').value = '1';
  document.getElementById('gm-upload-progress').style.display = 'none';
  document.getElementById('gm-current-img').style.display = 'none';
  updatePreview(null, '🎁');
}

function fillGiftForm(g) {
  document.getElementById('gm-name').value = g.name || '';
  document.getElementById('gm-hotkey').value = g.hot_key || '';
  document.getElementById('gm-price').value = g.price ?? 10;
  document.getElementById('gm-currency').value = g.currency || 'MIG';
  document.getElementById('gm-group').value = g.group_id ?? 1;
  document.getElementById('gm-sort').value = g.sort_order || '';
  document.getElementById('gm-available').value = g.num_available ?? '';
  document.getElementById('gm-msg').value = g.gift_all_message || '';
  document.getElementById('gm-vip').checked = !!g.group_vip_only;
  document.getElementById('gm-status').value = String(g.status ?? 1);

  // Update hotkey preview when changed
  document.getElementById('gm-hotkey').oninput = () => {
    if (!g.location_64x64_png) updatePreview(null, document.getElementById('gm-hotkey').value || '🎁');
  };

  if (g.location_64x64_png) {
    updatePreview(g.location_64x64_png, g.hot_key || '🎁');
    document.getElementById('gm-current-img').style.display = 'block';
    document.getElementById('gm-img-link').href = g.location_64x64_png;
    document.getElementById('gm-img-link').textContent = g.location_64x64_png;
  } else {
    updatePreview(null, g.hot_key || '🎁');
  }
}

function updatePreview(imgUrl, emoji) {
  const wrap = document.getElementById('gm-preview');
  if (imgUrl) {
    wrap.innerHTML = `<img src="${esc(imgUrl)}" alt="preview" />`;
  } else {
    wrap.innerHTML = `<span class="preview-emoji">${emoji || '🎁'}</span>`;
  }
}

function previewGiftFile(file) {
  if (file.size > 5 * 1024 * 1024) { toast('File terlalu besar! Maksimal 5MB', 'error'); return; }
  pendingUploadFile = file;
  const reader = new FileReader();
  reader.onload = (e) => updatePreview(e.target.result, null);
  reader.readAsDataURL(file);
}

async function saveGift() {
  const btn = document.getElementById('gm-save-btn');
  const name = document.getElementById('gm-name').value.trim();
  if (!name) { toast('Nama gift wajib diisi!', 'error'); return; }

  const payload = {
    name,
    hotKey: document.getElementById('gm-hotkey').value,
    price: document.getElementById('gm-price').value,
    currency: document.getElementById('gm-currency').value,
    groupId: document.getElementById('gm-group').value,
    sortOrder: document.getElementById('gm-sort').value,
    groupVipOnly: document.getElementById('gm-vip').checked,
    giftAllMessage: document.getElementById('gm-msg').value,
    numAvailable: document.getElementById('gm-available').value,
    status: document.getElementById('gm-status').value,
  };

  btn.textContent = 'Menyimpan...'; btn.disabled = true;

  let res;
  if (currentGiftId) {
    res = await api(`/gifts/${currentGiftId}`, { method: 'PATCH', body: payload });
  } else {
    res = await api('/gifts', { method: 'POST', body: payload });
  }

  if (!res || res.error) {
    toast(res?.error || 'Gagal menyimpan gift', 'error');
    btn.textContent = 'Simpan Gift'; btn.disabled = false;
    return;
  }

  const savedGift = res.gift;
  const savedId = savedGift?.id || currentGiftId;

  // Upload image jika ada file dipilih
  if (pendingUploadFile && savedId) {
    await uploadGiftImage(savedId, pendingUploadFile);
  } else {
    toast(currentGiftId ? 'Gift berhasil diupdate!' : 'Gift berhasil ditambah!', 'success');
    btn.textContent = 'Simpan Gift'; btn.disabled = false;
    closeGiftModal();
    const data = await api('/gifts');
    if (data) { giftsData = data.gifts; giftCategories = data.categories; drawGiftPage(); }
  }

  btn.textContent = 'Simpan Gift'; btn.disabled = false;
}

async function uploadGiftImage(giftId, file) {
  const progress = document.getElementById('gm-upload-progress');
  const fill = document.getElementById('gm-progress-fill');
  const msg = document.getElementById('gm-upload-msg');
  const btn = document.getElementById('gm-save-btn');

  progress.style.display = 'block';
  fill.style.width = '30%';
  msg.className = 'upload-msg';
  msg.textContent = '⬆ Mengupload ke ImageKit CDN...';
  btn.disabled = true;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    const mimeType = file.type || 'image/png';
    fill.style.width = '60%';
    try {
      const res = await api(`/gifts/${giftId}/upload`, {
        method: 'POST',
        body: { base64Data: base64, mimeType },
      });
      fill.style.width = '100%';
      if (res?.success) {
        msg.className = 'upload-msg success';
        msg.textContent = '✓ Upload berhasil! Gambar aktif di CDN.';
        toast('Gift dan gambar berhasil disimpan!', 'success');
        await new Promise(r => setTimeout(r, 800));
        closeGiftModal();
        const data = await api('/gifts');
        if (data) { giftsData = data.gifts; giftCategories = data.categories; drawGiftPage(); }
      } else {
        msg.className = 'upload-msg error';
        msg.textContent = '✗ ' + (res?.error || 'Upload gagal');
        toast(res?.error || 'Upload gambar gagal', 'error');
      }
    } catch (err) {
      msg.className = 'upload-msg error';
      msg.textContent = '✗ Error: ' + err.message;
      toast('Upload error: ' + err.message, 'error');
    }
    btn.disabled = false;
  };
  reader.readAsDataURL(file);
}

window.openGiftModal = openGiftModal;
window.deleteGift = async (id, name) => {
  confirm('Hapus Gift', `Yakin hapus gift "${name}"? Tindakan ini tidak bisa dibatalkan!`, async () => {
    const res = await api(`/gifts/${id}`, { method: 'DELETE' });
    if (res?.success) {
      toast(`Gift "${name}" berhasil dihapus`, 'success');
      giftsData = giftsData.filter(g => g.id !== id);
      drawGiftPage();
    }
  });
};
window.saveGift = saveGift;

// ─── STORE (Hadiah + Stiker tabs) ─────────────────────────────────────────────
let currentStoreTab = 'hadiah';
let storeContentEl = null;
let stickerPacksData = [];
let currentStickerPackId = null;
let currentStickerPackEditId = null;
let currentStickerItemId = null;
let currentStickerItemPackId = null;
let stickerPackContentEl = null;
let pendingStickerFile = null;

async function renderStore(el) {
  storeContentEl = el;
  el.innerHTML = `
  <div class="store-tab-bar">
    <button class="store-tab${currentStoreTab === 'hadiah' ? ' active' : ''}" id="store-tab-hadiah">🎁 Hadiah</button>
    <button class="store-tab${currentStoreTab === 'stiker' ? ' active' : ''}" id="store-tab-stiker">😊 Stiker</button>
  </div>
  <div id="store-tab-content"></div>`;

  document.getElementById('store-tab-hadiah').onclick = async () => {
    if (currentStoreTab === 'hadiah') return;
    currentStoreTab = 'hadiah';
    document.getElementById('store-tab-hadiah').classList.add('active');
    document.getElementById('store-tab-stiker').classList.remove('active');
    const tc = document.getElementById('store-tab-content');
    await renderGifts(tc);
  };
  document.getElementById('store-tab-stiker').onclick = async () => {
    if (currentStoreTab === 'stiker') return;
    currentStoreTab = 'stiker';
    document.getElementById('store-tab-stiker').classList.add('active');
    document.getElementById('store-tab-hadiah').classList.remove('active');
    const tc = document.getElementById('store-tab-content');
    currentStickerPackId = null;
    await renderStickerPacksTab(tc);
  };

  const tc = document.getElementById('store-tab-content');
  if (currentStoreTab === 'hadiah') {
    await renderGifts(tc);
  } else {
    await renderStickerPacksTab(tc);
  }
}

async function renderStickerPacksTab(el) {
  stickerPackContentEl = el;
  if (currentStickerPackId !== null) {
    await renderStickerDetail(el, currentStickerPackId);
  } else {
    await renderStickerPacksList(el);
  }
}

async function renderStickerPacksList(el) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat stiker pack...</div>';
  const data = await api('/stickers/packs');
  if (!data) return;
  stickerPacksData = data.packs || [];

  const typeStats = { emotikon: stickerPacksData.filter(p => p.type === 0).length, stiker: stickerPacksData.filter(p => p.type === 1).length };

  el.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div>
      <h2 style="font-size:16px;font-weight:600">Stiker Pack</h2>
      <p style="font-size:13px;color:var(--text-muted)">${fmtNum(stickerPacksData.length)} pack · ${typeStats.stiker} stiker · ${typeStats.emotikon} emotikon</p>
    </div>
    <button class="btn btn-primary" onclick="openStickerPackModal(null)">＋ Tambah Pack</button>
  </div>
  ${stickerPacksData.length === 0
    ? '<div class="empty">Belum ada stiker pack. Tambahkan pack pertama!</div>'
    : `<div class="gift-grid">${stickerPacksData.map(p => renderStickerPackCard(p)).join('')}</div>`}`;
}

function renderStickerPackCard(p) {
  const typeBadge = p.type === 0 ? 'blue' : 'purple';
  const typeLabel = p.type === 0 ? 'Emotikon' : 'Stiker';
  const iconEmoji = p.type === 0 ? '😊' : '🎭';
  return `
  <div class="gift-card" id="spcard-${p.id}">
    <div class="gift-img-wrap">
      <span class="gift-emoji">${iconEmoji}</span>
    </div>
    <div class="gift-name">${esc(p.name)}</div>
    <div style="margin-bottom:6px">
      <span class="badge ${typeBadge}" style="font-size:10px">${typeLabel}</span>
      <span class="badge ${p.status === 1 ? 'green' : 'gray'}" style="font-size:10px">${p.status === 1 ? 'Aktif' : 'Nonaktif'}</span>
    </div>
    <div class="gift-price">${p.sticker_count || 0} stiker · ${p.price > 0 ? fmtFloat(p.price) + ' MIG' : 'Gratis'}</div>
    <div class="gift-actions">
      <button class="btn btn-sm btn-outline" onclick="viewStickerPack(${p.id})" title="Kelola Stiker">📂 Kelola</button>
      <button class="btn btn-sm btn-outline" onclick="openStickerPackModal(${p.id})" title="Edit Pack">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="deleteStickerPack(${p.id},'${esc(p.name)}')" title="Hapus">🗑️</button>
    </div>
  </div>`;
}

async function viewStickerPack(packId) {
  currentStickerPackId = packId;
  await renderStickerDetail(stickerPackContentEl, packId);
}

async function renderStickerDetail(el, packId) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat stiker...</div>';
  const data = await api(`/stickers/packs/${packId}`);
  if (!data || data.error) { el.innerHTML = `<div class="empty">Gagal memuat pack: ${data?.error || 'error'}</div>`; return; }
  const pack = data.pack;
  const stickers = data.stickers || [];

  el.innerHTML = `
  <div class="sticker-breadcrumb">
    <span class="bc-link" onclick="goBackToStickerPacks()">← Semua Pack</span>
    <span style="color:var(--text-muted)">/</span>
    <strong>${esc(pack.name)}</strong>
    <span class="badge ${pack.type === 0 ? 'blue' : 'purple'}" style="font-size:10px">${pack.type === 0 ? 'Emotikon' : 'Stiker'}</span>
    <span class="badge ${pack.status === 1 ? 'green' : 'gray'}" style="font-size:10px">${pack.status === 1 ? 'Aktif' : 'Nonaktif'}</span>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div>
      <h2 style="font-size:16px;font-weight:600">${esc(pack.name)}</h2>
      <p style="font-size:13px;color:var(--text-muted)">${stickers.length} stiker${pack.description ? ' · ' + esc(pack.description) : ''} · ${pack.price > 0 ? fmtFloat(pack.price) + ' MIG' : 'Gratis'}</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-outline" onclick="openStickerPackModal(${pack.id})">✏️ Edit Pack</button>
      <button class="btn btn-primary" onclick="openStickerItemModal(null,${pack.id})">＋ Tambah Stiker</button>
    </div>
  </div>
  ${stickers.length === 0
    ? '<div class="empty">Belum ada stiker dalam pack ini. Klik "Tambah Stiker" untuk mulai!</div>'
    : `<div class="sticker-grid">${stickers.map(s => renderStickerItemCard(s)).join('')}</div>`}`;
}

function renderStickerItemCard(s) {
  const hasImg = !!s.location_png;
  const imgEl = hasImg
    ? `<img src="${esc(s.location_png)}?t=${Date.now()}" alt="${esc(s.alias)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span style="display:none;font-size:26px">😊</span>`
    : `<span style="font-size:26px">😊</span>`;
  return `
  <div class="sticker-card" id="scard-${s.id}">
    <div class="sticker-img-wrap">${imgEl}</div>
    ${hasImg ? `<span class="has-sticker-img">✓ CDN</span>` : `<span class="no-sticker-img">Belum ada gambar</span>`}
    <div class="sticker-alias">${esc(s.alias)}</div>
    <div class="sticker-actions">
      <button class="btn btn-sm btn-outline" onclick="openStickerItemModal(${s.id},${s.emoticon_pack_id})" title="Edit">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="deleteStickerItem(${s.id},'${esc(s.alias)}')" title="Hapus">🗑️</button>
    </div>
  </div>`;
}

function goBackToStickerPacks() {
  currentStickerPackId = null;
  renderStickerPacksList(stickerPackContentEl);
}

// ── Sticker Pack Modal ──────────────────────────────────────────────────────
function openStickerPackModal(packId) {
  currentStickerPackEditId = packId;
  document.getElementById('spm-title').textContent = packId ? 'Edit Pack Stiker' : 'Tambah Pack Stiker';
  resetStickerPackForm();
  if (packId) {
    const p = stickerPacksData.find(x => x.id === packId);
    if (p) fillStickerPackForm(p);
  }
  document.getElementById('sticker-pack-modal').classList.add('open');
}

window.closeStickerPackModal = () => {
  document.getElementById('sticker-pack-modal').classList.remove('open');
  currentStickerPackEditId = null;
};

function resetStickerPackForm() {
  document.getElementById('spm-name').value = '';
  document.getElementById('spm-type').value = '1';
  document.getElementById('spm-desc').value = '';
  document.getElementById('spm-price').value = '0';
  document.getElementById('spm-sort').value = '';
  document.getElementById('spm-status').value = '1';
  document.getElementById('spm-forsale').checked = true;
}

function fillStickerPackForm(p) {
  document.getElementById('spm-name').value = p.name || '';
  document.getElementById('spm-type').value = String(p.type ?? 1);
  document.getElementById('spm-desc').value = p.description || '';
  document.getElementById('spm-price').value = p.price ?? 0;
  document.getElementById('spm-sort').value = p.sort_order || '';
  document.getElementById('spm-status').value = String(p.status ?? 1);
  document.getElementById('spm-forsale').checked = !!p.for_sale;
}

async function saveStickerPack() {
  const btn = document.getElementById('spm-save-btn');
  const name = document.getElementById('spm-name').value.trim();
  if (!name) { toast('Nama pack wajib diisi!', 'error'); return; }

  const payload = {
    name,
    type: parseInt(document.getElementById('spm-type').value),
    description: document.getElementById('spm-desc').value.trim() || null,
    price: parseFloat(document.getElementById('spm-price').value) || 0,
    sortOrder: document.getElementById('spm-sort').value || null,
    status: parseInt(document.getElementById('spm-status').value),
    forSale: document.getElementById('spm-forsale').checked,
  };

  btn.textContent = 'Menyimpan...'; btn.disabled = true;

  let res;
  if (currentStickerPackEditId) {
    res = await api(`/stickers/packs/${currentStickerPackEditId}`, { method: 'PATCH', body: payload });
  } else {
    res = await api('/stickers/packs', { method: 'POST', body: payload });
  }

  btn.textContent = 'Simpan Pack'; btn.disabled = false;

  if (!res || res.error) { toast(res?.error || 'Gagal menyimpan pack', 'error'); return; }
  toast(currentStickerPackEditId ? 'Pack berhasil diupdate!' : 'Pack berhasil ditambah!', 'success');
  closeStickerPackModal();

  if (currentStickerPackId !== null) {
    await renderStickerDetail(stickerPackContentEl, currentStickerPackId);
  } else {
    await renderStickerPacksList(stickerPackContentEl);
  }
}

window.deleteStickerPack = async (id, name) => {
  confirm('Hapus Pack', `Yakin hapus pack "${name}"? Semua stiker dalam pack akan ikut terhapus!`, async () => {
    const res = await api(`/stickers/packs/${id}`, { method: 'DELETE' });
    if (res?.success) {
      toast(`Pack "${name}" berhasil dihapus`, 'success');
      if (currentStickerPackId === id) {
        currentStickerPackId = null;
        await renderStickerPacksList(stickerPackContentEl);
      } else {
        stickerPacksData = stickerPacksData.filter(p => p.id !== id);
        if (stickerPackContentEl) await renderStickerPacksList(stickerPackContentEl);
      }
    } else {
      toast(res?.error || 'Gagal menghapus pack', 'error');
    }
  });
};

window.openStickerPackModal = openStickerPackModal;
window.viewStickerPack = viewStickerPack;
window.goBackToStickerPacks = goBackToStickerPacks;
window.saveStickerPack = saveStickerPack;

// ── Sticker Item Modal ──────────────────────────────────────────────────────
function openStickerItemModal(stickerId, packId) {
  currentStickerItemId = stickerId;
  currentStickerItemPackId = packId;
  pendingStickerFile = null;
  document.getElementById('sim-title').textContent = stickerId ? 'Edit Stiker' : 'Tambah Stiker';
  resetStickerItemForm();

  if (stickerId) {
    api(`/stickers/packs/${packId}`).then(data => {
      if (data?.stickers) {
        const s = data.stickers.find(x => x.id === stickerId);
        if (s) fillStickerItemForm(s);
      }
    });
  }

  const fileInput = document.getElementById('sim-file');
  fileInput.value = '';
  fileInput.onchange = (e) => { const f = e.target.files[0]; if (f) previewStickerFile(f); };

  const zone = document.getElementById('sim-upload-zone');
  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('drag-over'); };
  zone.ondragleave = () => zone.classList.remove('drag-over');
  zone.ondrop = (e) => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const f = e.dataTransfer.files[0]; if (f) previewStickerFile(f);
  };

  document.getElementById('sim-del-img-btn').onclick = async () => {
    if (!currentStickerItemId) return;
    confirm('Hapus Gambar', 'Yakin hapus gambar stiker ini?', async () => {
      const res = await api(`/stickers/emoticons/${currentStickerItemId}`, { method: 'PATCH', body: { clearImage: true } });
      if (res?.success) {
        toast('Gambar stiker dihapus', 'success');
        updateStickerPreview(null);
        document.getElementById('sim-current-img').style.display = 'none';
      }
    });
  };

  document.getElementById('sticker-item-modal').classList.add('open');
}

window.closeStickerItemModal = () => {
  document.getElementById('sticker-item-modal').classList.remove('open');
  currentStickerItemId = null;
  pendingStickerFile = null;
};

function resetStickerItemForm() {
  document.getElementById('sim-alias').value = '';
  document.getElementById('sim-type').value = '0';
  document.getElementById('sim-upload-progress').style.display = 'none';
  document.getElementById('sim-current-img').style.display = 'none';
  updateStickerPreview(null);
}

function fillStickerItemForm(s) {
  document.getElementById('sim-alias').value = s.alias || '';
  document.getElementById('sim-type').value = String(s.type ?? 0);
  if (s.location_png) {
    updateStickerPreview(s.location_png);
    document.getElementById('sim-current-img').style.display = 'block';
    document.getElementById('sim-img-link').href = s.location_png;
    document.getElementById('sim-img-link').textContent = s.location_png;
  } else {
    updateStickerPreview(null);
  }
}

function updateStickerPreview(imgUrl) {
  const wrap = document.getElementById('sim-preview');
  if (!wrap) return;
  wrap.innerHTML = imgUrl
    ? `<img src="${esc(imgUrl)}" alt="preview" />`
    : `<span class="preview-emoji">😊</span>`;
}

function previewStickerFile(file) {
  if (file.size > 5 * 1024 * 1024) { toast('File terlalu besar! Maksimal 5MB', 'error'); return; }
  pendingStickerFile = file;
  const reader = new FileReader();
  reader.onload = (e) => updateStickerPreview(e.target.result);
  reader.readAsDataURL(file);
}

async function saveStickerItem() {
  const btn = document.getElementById('sim-save-btn');
  const alias = document.getElementById('sim-alias').value.trim();
  if (!alias) { toast('Alias stiker wajib diisi!', 'error'); return; }

  const payload = {
    alias,
    type: parseInt(document.getElementById('sim-type').value),
    emoticonPackId: currentStickerItemPackId,
  };

  btn.textContent = 'Menyimpan...'; btn.disabled = true;

  let res;
  let savedId = currentStickerItemId;

  if (currentStickerItemId) {
    res = await api(`/stickers/emoticons/${currentStickerItemId}`, { method: 'PATCH', body: payload });
  } else {
    res = await api('/stickers/emoticons', { method: 'POST', body: payload });
    savedId = res?.sticker?.id;
  }

  if (!res || res.error) {
    toast(res?.error || 'Gagal menyimpan stiker', 'error');
    btn.textContent = 'Simpan Stiker'; btn.disabled = false;
    return;
  }

  if (pendingStickerFile && savedId) {
    await uploadStickerImage(savedId, pendingStickerFile);
  } else {
    toast(currentStickerItemId ? 'Stiker berhasil diupdate!' : 'Stiker berhasil ditambah!', 'success');
    btn.textContent = 'Simpan Stiker'; btn.disabled = false;
    closeStickerItemModal();
    if (currentStickerPackId !== null) {
      await renderStickerDetail(stickerPackContentEl, currentStickerPackId);
    }
  }

  btn.textContent = 'Simpan Stiker'; btn.disabled = false;
}

async function uploadStickerImage(stickerId, file) {
  const progress = document.getElementById('sim-upload-progress');
  const fill = document.getElementById('sim-progress-fill');
  const msg = document.getElementById('sim-upload-msg');
  const btn = document.getElementById('sim-save-btn');

  progress.style.display = 'block';
  fill.style.width = '30%';
  msg.className = 'upload-msg';
  msg.textContent = '⬆ Mengupload ke ImageKit CDN...';
  btn.disabled = true;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result.split(',')[1];
    const mimeType = file.type || 'image/png';
    fill.style.width = '60%';
    try {
      const res = await api(`/stickers/emoticons/${stickerId}/upload`, {
        method: 'POST',
        body: { base64Data: base64, mimeType },
      });
      fill.style.width = '100%';
      if (res?.success) {
        msg.className = 'upload-msg success';
        msg.textContent = '✓ Upload berhasil! Gambar aktif di CDN.';
        toast('Stiker dan gambar berhasil disimpan!', 'success');
        await new Promise(r => setTimeout(r, 800));
        closeStickerItemModal();
        if (currentStickerPackId !== null) {
          await renderStickerDetail(stickerPackContentEl, currentStickerPackId);
        }
      } else {
        msg.className = 'upload-msg error';
        msg.textContent = '✗ ' + (res?.error || 'Upload gagal');
        toast(res?.error || 'Upload gambar gagal', 'error');
      }
    } catch (err) {
      msg.className = 'upload-msg error';
      msg.textContent = '✗ Error: ' + err.message;
      toast('Upload error: ' + err.message, 'error');
    }
    btn.disabled = false;
  };
  reader.readAsDataURL(file);
}

window.openStickerItemModal = openStickerItemModal;
window.deleteStickerItem = async (id, alias) => {
  confirm('Hapus Stiker', `Yakin hapus stiker "${alias}"? Tindakan ini tidak bisa dibatalkan!`, async () => {
    const res = await api(`/stickers/emoticons/${id}`, { method: 'DELETE' });
    if (res?.success) {
      toast(`Stiker "${alias}" berhasil dihapus`, 'success');
      if (currentStickerPackId !== null) {
        await renderStickerDetail(stickerPackContentEl, currentStickerPackId);
      }
    } else {
      toast(res?.error || 'Gagal menghapus stiker', 'error');
    }
  });
};
window.saveStickerItem = saveStickerItem;

// ─── MERCHANTS ────────────────────────────────────────────────────────────────
const MERCHANT_TYPE = {1:'Merchant',2:'Mentor',3:'HeadMentor'};

async function renderMerchants(el, page = 1, search = '') {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';
  const data = await api(`/merchants?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
  if (!data) return;
  const totalPages = Math.ceil(data.total / 20);
  el.innerHTML = `
  <div class="search-row">
    <input class="input" id="merchant-search" placeholder="Cari merchant..." value="${esc(search)}" />
    <button class="btn btn-primary" id="merchant-search-btn">Cari</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Username</th><th>Display Name</th><th>Tipe</th><th>Poin</th><th>Status</th><th>Dibuat</th><th>Aksi</th></tr></thead>
      <tbody>
        ${data.merchants.length === 0 ? `<tr><td colspan="7"><div class="empty">Tidak ada merchant</div></td></tr>` :
          data.merchants.map(m => `
          <tr>
            <td><strong style="color:${esc(m.username_color || '#000')}">${esc(m.username)}</strong></td>
            <td>${esc(m.display_name)}<br><small style="color:var(--text-muted)">${esc(m.category || '-')}</small></td>
            <td><span class="badge ${m.merchant_type >= 3 ? 'purple' : m.merchant_type === 2 ? 'red' : 'blue'}">${MERCHANT_TYPE[m.merchant_type] || m.merchant_type}</span></td>
            <td>${fmtNum(m.total_points)}</td>
            <td><span class="badge ${m.status === 1 ? 'green' : 'red'}">${m.status === 1 ? 'Aktif' : 'Nonaktif'}</span></td>
            <td>${fmtDateTime(m.created_at)}</td>
            <td><button class="btn btn-sm btn-outline" onclick="toggleMerchant('${m.id}',${m.status === 1 ? 0 : 1},'${esc(m.username)}')">${m.status === 1 ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="pagination">
    <div class="page-info">Total: ${fmtNum(data.total)} | Halaman ${page} dari ${totalPages}</div>
    ${page > 1 ? `<button class="btn btn-outline btn-sm" id="prev-btn">← Prev</button>` : ''}
    ${page < totalPages ? `<button class="btn btn-outline btn-sm" id="next-btn">Next →</button>` : ''}
  </div>`;

  document.getElementById('merchant-search-btn').onclick = () => renderMerchants(el, 1, document.getElementById('merchant-search').value);
  document.getElementById('merchant-search').onkeydown = (e) => { if (e.key === 'Enter') renderMerchants(el, 1, document.getElementById('merchant-search').value); };
  if (document.getElementById('prev-btn')) document.getElementById('prev-btn').onclick = () => renderMerchants(el, page - 1, search);
  if (document.getElementById('next-btn')) document.getElementById('next-btn').onclick = () => renderMerchants(el, page + 1, search);

  window.toggleMerchant = async (id, status, username) => {
    confirm(`${status === 1 ? 'Aktifkan' : 'Nonaktifkan'} Merchant`, `Yakin ubah status merchant @${username}?`, async () => {
      await api(`/merchants/${id}/status`, { method: 'PATCH', body: { status } });
      renderMerchants(el, page, search);
    }, status !== 1);
  };
}

// ─── ADD MERCHANT ─────────────────────────────────────────────────────────────
function renderAddMerchant(el) {
  el.innerHTML = `
  <div class="card" style="max-width:600px">
    <div class="card-title">Form Tambah Merchant</div>
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="field-group">
        <label>Username <span style="color:var(--danger)">*</span></label>
        <input class="input" id="am-username" placeholder="username merchant..." />
      </div>
      <div class="field-group">
        <label>Display Name <span style="color:var(--danger)">*</span></label>
        <input class="input" id="am-display-name" placeholder="nama tampilan..." />
      </div>
      <div class="field-group">
        <label>Level Merchant <span style="color:var(--danger)">*</span></label>
        <select class="input" id="am-type">
          <option value="1">Level 1 - Merchant</option>
          <option value="2">Level 2 - Mentor</option>
          <option value="3">Level 3 - HeadMentor</option>
        </select>
      </div>
      <div class="field-group">
        <label>Deskripsi</label>
        <input class="input" id="am-description" placeholder="deskripsi singkat..." />
      </div>
      <div class="field-group">
        <label>Kategori</label>
        <input class="input" id="am-category" placeholder="kategori bisnis..." />
      </div>
      <div class="field-group">
        <label>Website URL</label>
        <input class="input" id="am-website" placeholder="https://..." />
      </div>
      <div class="field-group">
        <label>Warna Username</label>
        <div style="display:flex;gap:10px;align-items:center">
          <input type="color" id="am-color" value="#990099" style="width:48px;height:36px;border:1px solid var(--border);border-radius:8px;padding:2px;cursor:pointer" />
          <input class="input" id="am-color-text" value="#990099" placeholder="#990099" style="flex:1" />
        </div>
      </div>
      <div class="field-group">
        <label>Mentor (username)</label>
        <input class="input" id="am-mentor" placeholder="username mentor (opsional)..." />
        <span style="font-size:11px;color:var(--text-muted)">Diisi jika merchant memiliki mentor</span>
      </div>
      <div class="field-group">
        <label>Referrer (username)</label>
        <input class="input" id="am-referrer" placeholder="username referrer (opsional)..." />
      </div>
      <div id="am-error" style="color:var(--danger);font-size:13px;display:none"></div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-primary" id="am-save-btn">Simpan Merchant</button>
        <button class="btn btn-outline" onclick="state.page='merchants';render()">Batal</button>
      </div>
    </div>
  </div>`;

  const colorPicker = document.getElementById('am-color');
  const colorText = document.getElementById('am-color-text');
  const typeSelect = document.getElementById('am-type');
  const levelDefaultColors = { 1: '#990099', 2: '#FF0000', 3: '#FF69B4' };
  colorPicker.oninput = () => { colorText.value = colorPicker.value; };
  colorText.oninput = () => {
    if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) colorPicker.value = colorText.value;
  };
  typeSelect.onchange = () => {
    const nextColor = levelDefaultColors[parseInt(typeSelect.value)] || '#990099';
    colorPicker.value = nextColor;
    colorText.value = nextColor;
  };

  document.getElementById('am-save-btn').onclick = async () => {
    const errEl = document.getElementById('am-error');
    errEl.style.display = 'none';
    const username = document.getElementById('am-username').value.trim();
    const displayName = document.getElementById('am-display-name').value.trim();
    const merchantType = parseInt(document.getElementById('am-type').value);
    const description = document.getElementById('am-description').value.trim();
    const category = document.getElementById('am-category').value.trim();
    const websiteUrl = document.getElementById('am-website').value.trim();
    const usernameColor = document.getElementById('am-color-text').value.trim() || '#990099';
    const mentor = document.getElementById('am-mentor').value.trim();
    const referrer = document.getElementById('am-referrer').value.trim();

    if (!username) { errEl.textContent = 'Username wajib diisi'; errEl.style.display = 'block'; return; }
    if (!displayName) { errEl.textContent = 'Display Name wajib diisi'; errEl.style.display = 'block'; return; }

    const btn = document.getElementById('am-save-btn');
    btn.textContent = 'Menyimpan...'; btn.disabled = true;

    const body = { username, displayName, merchantType, description, category, websiteUrl, usernameColor };
    if (mentor) body.mentor = mentor;
    if (referrer) body.referrer = referrer;

    const res = await api('/merchants', { method: 'POST', body });
    btn.textContent = 'Simpan Merchant'; btn.disabled = false;

    if (!res || res.error) { errEl.textContent = res?.error || 'Gagal menyimpan merchant'; errEl.style.display = 'block'; return; }
    toast('Merchant berhasil ditambahkan', 'success');
    state.page = 'merchants';
    render();
  };
}

// ─── MERCHANT TAGS ────────────────────────────────────────────────────────────
const TAG_STATUS = {0:'Inactive',1:'Active',2:'Pending'};
const TAG_TYPE = {1:'Top',2:'Non-Top'};

async function renderMerchantTags(el, page = 1) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';
  const data = await api(`/merchants/tags?page=${page}&limit=20`);
  if (!data) return;
  const totalPages = Math.ceil(data.total / 20);
  el.innerHTML = `
  <div class="table-wrap">
    <table>
      <thead><tr><th>Merchant</th><th>Tagged User</th><th>Tipe</th><th>Status</th><th>Jumlah</th><th>Kadaluarsa</th><th>Dibuat</th></tr></thead>
      <tbody>
        ${data.tags.length === 0 ? `<tr><td colspan="7"><div class="empty">Tidak ada tag</div></td></tr>` :
          data.tags.map(t => `
          <tr>
            <td>${esc(t.merchant_username)}</td>
            <td>${esc(t.tagged_username)}</td>
            <td><span class="badge ${t.type === 1 ? 'purple' : 'blue'}">${TAG_TYPE[t.type] || t.type}</span></td>
            <td><span class="badge ${t.status === 1 ? 'green' : t.status === 2 ? 'yellow' : 'gray'}">${TAG_STATUS[t.status] || t.status}</span></td>
            <td>${t.amount ? fmtFloat(t.amount)+' '+esc(t.currency||'') : '-'}</td>
            <td>${t.expiry ? fmtDateTime(t.expiry) : '-'}</td>
            <td>${fmtDateTime(t.created_at)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div class="pagination">
    <div class="page-info">Total: ${fmtNum(data.total)} tag | Halaman ${page} dari ${totalPages}</div>
    ${page > 1 ? `<button class="btn btn-outline btn-sm" id="prev-btn">← Prev</button>` : ''}
    ${page < totalPages ? `<button class="btn btn-outline btn-sm" id="next-btn">Next →</button>` : ''}
  </div>`;
  if (document.getElementById('prev-btn')) document.getElementById('prev-btn').onclick = () => renderMerchantTags(el, page - 1);
  if (document.getElementById('next-btn')) document.getElementById('next-btn').onclick = () => renderMerchantTags(el, page + 1);
}

// ─── BOTS ────────────────────────────────────────────────────────────────────
async function renderBots(el) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';
  const [sessions, stats] = await Promise.all([
    api('/bots/sessions?page=1&limit=20'),
    api('/bots/stats'),
  ]);
  el.innerHTML = `
  <div class="two-col" style="margin-bottom:16px">
    <div class="card">
      <div class="card-title">Statistik Game</div>
      ${stats.gameStats.length === 0 ? '<div class="empty">Belum ada data bot</div>' :
        `<table><thead><tr><th>Game</th><th>Total Sesi</th><th>Total Pot</th></tr></thead><tbody>
        ${stats.gameStats.map(g => `
          <tr><td><strong>${esc(g.game_type)}</strong></td><td>${fmtNum(g.total_sessions)}</td><td>${g.total_pot ? fmtFloat(parseFloat(g.total_pot)) : '-'}</td></tr>
        `).join('')}
        </tbody></table>`}
    </div>
    <div class="stat-card blue" style="height:fit-content">
      <div class="stat-label">Total Sesi Bot</div>
      <div class="stat-value">${fmtNum(sessions?.total || 0)}</div>
      <div class="stat-sub">Semua game</div>
    </div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Bot</th><th>Game</th><th>Chatroom</th><th>Status</th><th>Pot</th><th>Dibuat</th></tr></thead>
      <tbody>
        ${!sessions || sessions.sessions.length === 0 ? `<tr><td colspan="6"><div class="empty">Tidak ada sesi bot aktif</div></td></tr>` :
          sessions.sessions.map(s => `
          <tr>
            <td>${esc(s.bot_username)}</td>
            <td><span class="badge purple">${esc(s.game_type)}</span></td>
            <td>${esc(s.chatroom_id || '-')}</td>
            <td><span class="badge ${s.status === 'active' ? 'green' : 'gray'}">${esc(s.status)}</span></td>
            <td>${s.pot ? fmtFloat(s.pot) : '-'}</td>
            <td>${fmtDateTime(s.created_at)}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtNum(n) { return Number(n).toLocaleString('id-ID'); }
function fmtFloat(n) { return Number(n).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDateTime(dt) {
  if (!dt) return '-';
  return new Date(dt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtDate(dt) {
  if (!dt) return '-';
  return new Date(dt).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
}

// ─── ADMIN MANAGEMENT ────────────────────────────────────────────────────────
async function renderAdminManagement(el, search = '') {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat data administrator...</div>';

  const [data, logsData] = await Promise.all([
    api('/users?limit=200&search=' + encodeURIComponent(search)),
    api('/users/admin-logs?limit=50'),
  ]);
  if (!data) return;

  const admins = data.users.filter(u => u.is_admin);
  const nonAdmins = search ? data.users.filter(u => !u.is_admin) : [];
  const logs = logsData?.logs || [];

  el.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:20px;padding:4px 0">

    <div class="card" style="padding:20px">
      <h3 style="margin:0 0 4px;font-size:15px;font-weight:600">Administrator Aktif</h3>
      <p style="margin:0 0 16px;color:var(--text-muted);font-size:13px">Daftar pengguna dengan hak akses administrator global di aplikasi.</p>
      ${admins.length === 0 ? '<div class="empty" style="padding:24px">Tidak ada administrator ditemukan</div>' : `
      <table class="table">
        <thead><tr><th>User</th><th>Email</th><th>Bergabung</th><th>Aksi</th></tr></thead>
        <tbody>
          ${admins.map(u => `
          <tr>
            <td>
              <strong>@${esc(u.username)}</strong>
              ${u.display_name ? `<br><small style="color:var(--text-muted)">${esc(u.display_name)}</small>` : ''}
            </td>
            <td><small>${esc(u.email || '-')}</small></td>
            <td><small>${fmtDateTime(u.created_at)}</small></td>
            <td>
              <button class="btn btn-sm btn-danger" onclick="revokeAdmin('${u.id}', '${esc(u.username)}')">Cabut Admin</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>`}
    </div>

    <div class="card" style="padding:20px">
      <h3 style="margin:0 0 4px;font-size:15px;font-weight:600">Tambah Administrator</h3>
      <p style="margin:0 0 16px;color:var(--text-muted);font-size:13px">Cari pengguna berdasarkan username atau email, lalu berikan hak akses administrator.</p>
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <input class="input" id="admin-search-input" type="text" placeholder="Cari username atau email..." value="${esc(search)}" style="flex:1" />
        <button class="btn btn-primary" id="admin-search-btn">Cari</button>
      </div>
      ${search && nonAdmins.length === 0 ? `<div class="empty" style="padding:20px">Tidak ada pengguna non-admin ditemukan untuk "<strong>${esc(search)}</strong>"</div>` : ''}
      ${nonAdmins.length > 0 ? `
      <table class="table">
        <thead><tr><th>User</th><th>Email</th><th>Bergabung</th><th>Aksi</th></tr></thead>
        <tbody>
          ${nonAdmins.map(u => `
          <tr>
            <td>
              <strong>@${esc(u.username)}</strong>
              ${u.display_name ? `<br><small style="color:var(--text-muted)">${esc(u.display_name)}</small>` : ''}
            </td>
            <td><small>${esc(u.email || '-')}</small></td>
            <td><small>${fmtDateTime(u.created_at)}</small></td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="grantAdmin('${u.id}', '${esc(u.username)}')">Jadikan Admin</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>` : (!search ? '<div class="empty" style="padding:20px;color:var(--text-muted);font-size:13px">Masukkan username atau email untuk mencari pengguna</div>' : '')}
    </div>

    <div class="card" style="padding:20px">
      <h3 style="margin:0 0 4px;font-size:15px;font-weight:600">Log Aktivitas Admin</h3>
      <p style="margin:0 0 16px;color:var(--text-muted);font-size:13px">Riwayat perubahan hak akses administrator — siapa melakukan apa dan kapan.</p>
      ${logs.length === 0 ? '<div class="empty" style="padding:20px">Belum ada aktivitas yang tercatat</div>' : `
      <table class="table">
        <thead><tr><th>Aksi</th><th>Target User</th><th>Dilakukan Oleh</th><th>Waktu</th></tr></thead>
        <tbody>
          ${logs.map(log => {
            const isGrant = log.action === 'grant';
            const badge = isGrant
              ? '<span class="badge" style="background:rgba(74,222,128,0.15);color:#16a34a;border:1px solid rgba(74,222,128,0.3);font-size:11px;padding:2px 7px;border-radius:4px">Beri Admin</span>'
              : '<span class="badge" style="background:rgba(248,113,113,0.15);color:#dc2626;border:1px solid rgba(248,113,113,0.3);font-size:11px;padding:2px 7px;border-radius:4px">Cabut Admin</span>';
            return `
            <tr>
              <td>${badge}</td>
              <td><strong>@${esc(log.target_username)}</strong></td>
              <td><span style="color:var(--text-muted)">@${esc(log.performed_by)}</span></td>
              <td><small style="color:var(--text-muted)">${fmtDateTime(log.created_at)}</small></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`}
    </div>

  </div>`;

  const searchInput = document.getElementById('admin-search-input');
  document.getElementById('admin-search-btn').onclick = () => {
    renderAdminManagement(el, searchInput.value.trim());
  };
  searchInput.onkeydown = (e) => {
    if (e.key === 'Enter') renderAdminManagement(el, searchInput.value.trim());
  };
}

window.grantAdmin = function(id, username) {
  confirm(
    'Jadikan Administrator',
    `Apakah Anda yakin ingin memberikan hak akses administrator kepada @${username}?`,
    async () => {
      const res = await api(`/users/${id}/admin`, { method: 'PATCH', body: { isAdmin: true } });
      if (res && res.success) {
        toast(`@${username} berhasil dijadikan administrator`, 'success');
        await renderAdminManagement(document.getElementById('content'));
      } else {
        toast(res?.error || 'Gagal memberikan hak admin', 'error');
      }
    },
    false
  );
};

window.revokeAdmin = function(id, username) {
  confirm(
    'Cabut Hak Administrator',
    `Apakah Anda yakin ingin mencabut hak akses administrator dari @${username}?`,
    async () => {
      const res = await api(`/users/${id}/admin`, { method: 'PATCH', body: { isAdmin: false } });
      if (res && res.success) {
        toast(`Hak admin @${username} berhasil dicabut`, 'success');
        await renderAdminManagement(document.getElementById('content'));
      } else {
        toast(res?.error || 'Gagal mencabut hak admin', 'error');
      }
    },
    true
  );
};

// ─── BROADCAST ───────────────────────────────────────────────────────────────
function renderBroadcast(el) {
  el.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:20px;padding:4px 0;max-width:760px">

    <div class="card" style="padding:20px;border-left:4px solid #F47422">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span style="font-size:20px">📢</span>
        <h3 style="margin:0;font-size:15px;font-weight:600">Broadcast Pesan Sistem</h3>
      </div>
      <p style="margin:0;color:var(--text-muted);font-size:13px">
        Kirim pesan ke semua ruang obrolan aktif sebagai pesan sistem (warna oranye Administrator).
        Pengguna online juga akan mendapat notifikasi popup.
      </p>
    </div>

    <div class="card" style="padding:20px">
      <div class="form-group" style="margin-bottom:16px">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Judul Notifikasi <span style="color:var(--text-muted);font-weight:400">(untuk popup alert)</span></label>
        <input class="input" id="bc-title" type="text" placeholder="Contoh: Pengumuman Penting" maxlength="80" style="width:100%" />
      </div>

      <div class="form-group" style="margin-bottom:16px">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:6px">Pesan <span style="color:#e53e3e">*</span></label>
        <textarea class="input" id="bc-message" rows="4" placeholder="Tulis pesan siaran di sini..." maxlength="500" style="width:100%;resize:vertical;font-family:inherit"></textarea>
        <div style="text-align:right;font-size:11px;color:var(--text-muted);margin-top:4px"><span id="bc-char-count">0</span>/500</div>
      </div>

      <div class="form-group" style="margin-bottom:20px">
        <label style="font-size:13px;font-weight:600;display:block;margin-bottom:8px">Mode Pengiriman</label>
        <div style="display:flex;flex-direction:column;gap:8px">
          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border);border-radius:8px;transition:border-color 0.15s" id="mode-both-wrap">
            <input type="radio" name="bc-mode" value="both" checked style="margin-top:3px;accent-color:#F47422" />
            <div>
              <div style="font-size:13px;font-weight:600">Semua — Chatroom + Popup Alert</div>
              <div style="font-size:12px;color:var(--text-muted)">Pesan masuk ke semua chatroom dan muncul sebagai notifikasi popup di layar pengguna online</div>
            </div>
          </label>
          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border);border-radius:8px;transition:border-color 0.15s" id="mode-rooms-wrap">
            <input type="radio" name="bc-mode" value="rooms" style="margin-top:3px;accent-color:#F47422" />
            <div>
              <div style="font-size:13px;font-weight:600">Chatroom Saja</div>
              <div style="font-size:12px;color:var(--text-muted)">Pesan masuk ke semua chatroom sebagai pesan sistem tanpa popup</div>
            </div>
          </label>
          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;border:1px solid var(--border);border-radius:8px;transition:border-color 0.15s" id="mode-alert-wrap">
            <input type="radio" name="bc-mode" value="alert" style="margin-top:3px;accent-color:#F47422" />
            <div>
              <div style="font-size:13px;font-weight:600">Popup Alert Saja</div>
              <div style="font-size:12px;color:var(--text-muted)">Hanya kirim notifikasi popup ke semua pengguna yang sedang online</div>
            </div>
          </label>
        </div>
      </div>

      <div id="bc-preview" style="display:none;background:rgba(244,116,34,0.07);border:1px solid rgba(244,116,34,0.3);border-radius:8px;padding:12px 14px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:600;color:#F47422;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Preview Pesan</div>
        <div style="font-size:13px;color:var(--text-primary)"><span style="color:#F47422;font-weight:600">System: </span><span id="bc-preview-text"></span></div>
      </div>

      <button class="btn btn-primary" id="bc-send-btn" style="background:#F47422;border-color:#F47422;width:100%;font-size:14px;padding:10px" disabled>
        Kirim Broadcast
      </button>
    </div>

    <div class="card" id="bc-result-card" style="padding:20px;display:none">
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:600">Hasil Pengiriman</h3>
      <div id="bc-result-body"></div>
    </div>

  </div>`;

  const titleEl   = document.getElementById('bc-title');
  const msgEl     = document.getElementById('bc-message');
  const charCount = document.getElementById('bc-char-count');
  const preview   = document.getElementById('bc-preview');
  const previewTxt= document.getElementById('bc-preview-text');
  const sendBtn   = document.getElementById('bc-send-btn');
  const resultCard= document.getElementById('bc-result-card');
  const resultBody= document.getElementById('bc-result-body');

  function updateState() {
    const txt = msgEl.value.trim();
    charCount.textContent = msgEl.value.length;
    sendBtn.disabled = !txt;
    if (txt) {
      preview.style.display = 'block';
      previewTxt.textContent = txt;
    } else {
      preview.style.display = 'none';
    }
  }

  msgEl.oninput = updateState;

  sendBtn.onclick = () => {
    const message = msgEl.value.trim();
    const title   = titleEl.value.trim() || 'Pengumuman';
    const mode    = document.querySelector('input[name="bc-mode"]:checked')?.value || 'both';

    if (!message) return;

    const modeLabel = { both: 'Chatroom + Popup Alert', rooms: 'Chatroom Saja', alert: 'Popup Alert Saja' }[mode] || mode;

    confirm(
      'Kirim Broadcast',
      `Anda akan mengirim pesan ke semua ruang obrolan aktif (mode: ${modeLabel}). Lanjutkan?`,
      async () => {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Mengirim...';
        resultCard.style.display = 'none';

        const res = await api('/broadcast', { method: 'POST', body: { message, title, mode } });

        sendBtn.disabled = false;
        sendBtn.textContent = 'Kirim Broadcast';

        if (!res || res.error) {
          toast(res?.error || 'Gagal mengirim broadcast', 'error');
          return;
        }

        const toastMsg = res.note
          ? `Broadcast tersimpan ke ${res.roomsReached ?? 0} chatroom (mode offline)`
          : `Broadcast berhasil dikirim ke ${res.roomsReached ?? 0} chatroom`;
        toast(toastMsg, 'success');

        resultCard.style.display = 'block';
        const failedRooms = (res.results || []).filter(r => !r.ok);
        resultBody.innerHTML = `
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
            <div style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:22px;font-weight:700;color:#16a34a">${res.roomsReached ?? 0}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Chatroom berhasil</div>
            </div>
            <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:22px;font-weight:700;color:#dc2626">${failedRooms.length}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Chatroom gagal</div>
            </div>
            <div style="background:rgba(244,116,34,0.1);border:1px solid rgba(244,116,34,0.25);border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:22px;font-weight:700;color:#F47422">${res.onlineUsers ?? 0}</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Pengguna online</div>
            </div>
          </div>
          ${failedRooms.length > 0 ? `
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
            <strong>Chatroom yang gagal:</strong> ${failedRooms.map(r => esc(r.roomName)).join(', ')}
          </div>` : ''}
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px">
            Mode: <strong>${esc(modeLabel)}</strong> &nbsp;·&nbsp; Pesan: "<em>${esc(message.length > 80 ? message.substring(0,80)+'…' : message)}</em>"
          </div>
          ${res.note ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);border-radius:6px;font-size:12px;color:#92400e">⚠️ ${esc(res.note)}</div>` : ''}`;
      },
      false
    );
  };
}

// ─── APK RELEASES ─────────────────────────────────────────────────────────────
let releasesData = [];

function convertDriveUrl(url) {
  if (!url) return url;
  // https://drive.google.com/file/d/FILE_ID/view...
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?&#]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=download&id=${fileMatch[1]}`;
  // https://drive.google.com/open?id=FILE_ID
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return `https://drive.google.com/uc?export=download&id=${openMatch[1]}`;
  // Already a direct uc download link — leave as-is
  return url;
}

async function renderReleases(el) {
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat rilis APK...</div>';
  const data = await api('/releases');
  if (!data) return;
  releasesData = data.releases || [];
  drawReleasesPage(el);
}

function fmtFileSize(bytes) {
  if (!bytes || bytes === 0) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

function drawReleasesPage(el) {
  const activeRelease = releasesData.find(r => r.is_active);
  el.innerHTML = `
    <div style="max-width:900px">
      <!-- UPLOAD FORM -->
      <div class="card" style="margin-bottom:24px">
        <h2 style="margin-bottom:20px;font-size:17px;font-weight:700">📤 Upload Rilis APK Baru</h2>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Nama Versi *</label>
            <input id="rel-version-name" class="form-input" type="text" placeholder="Contoh: 1.2.3" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Kode Versi *</label>
            <input id="rel-version-code" class="form-input" type="number" placeholder="Contoh: 42" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Min Android API</label>
            <input id="rel-min-android" class="form-input" type="number" placeholder="7 (Android 7.0)" value="7" />
          </div>
          <div>
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">File APK</label>
            <input id="rel-file" class="form-input" type="file" accept=".apk" style="padding:6px" />
          </div>
          <div style="grid-column:span 2">
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Atau URL Download Langsung (termasuk Google Drive)</label>
            <input id="rel-url" class="form-input" type="text" placeholder="https://drive.google.com/file/d/xxxx/view  atau  https://cdn.example.com/app.apk" oninput="previewDriveUrl(this)" />
            <div id="rel-url-preview" style="font-size:11px;color:#60a5fa;margin-top:4px;word-break:break-all"></div>
          </div>
          <div style="grid-column:span 2">
            <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;color:var(--text-muted)">Changelog (opsional)</label>
            <textarea id="rel-changelog" class="form-input" rows="3" placeholder="Daftar perubahan di versi ini..." style="resize:vertical"></textarea>
          </div>
        </div>
        <div style="margin-top:16px;display:flex;gap:12px;align-items:center">
          <button class="btn btn-primary" id="rel-upload-btn" onclick="submitRelease()">
            <span id="rel-upload-label">📦 Upload & Aktifkan</span>
          </button>
          <span id="rel-upload-status" style="font-size:13px;color:var(--text-muted)"></span>
        </div>
        <div style="margin-top:10px;font-size:12px;color:var(--text-muted)">
          ⚠️ Mengunggah rilis baru akan otomatis menonaktifkan rilis yang sedang aktif.
        </div>
      </div>

      <!-- ACTIVE RELEASE -->
      ${activeRelease ? `
      <div class="card" style="margin-bottom:24px;border:1px solid rgba(100,200,100,0.3);background:rgba(20,60,20,0.3)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:10px;height:10px;border-radius:50%;background:#4ade80"></div>
          <span style="font-size:15px;font-weight:700;color:#4ade80">Rilis Aktif</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px">
          <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Versi</div><div style="font-weight:700;font-size:16px">v${esc(String(activeRelease.version_name))}</div></div>
          <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Build</div><div style="font-weight:600">${esc(String(activeRelease.version_code))}</div></div>
          <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Ukuran</div><div style="font-weight:600">${fmtFileSize(activeRelease.file_size)}</div></div>
          <div><div style="font-size:11px;color:var(--text-muted);margin-bottom:3px">Min Android</div><div style="font-weight:600">API ${esc(String(activeRelease.min_android || 7))}</div></div>
        </div>
        ${activeRelease.changelog ? `<div style="margin-top:12px;font-size:13px;color:var(--text-muted);border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;white-space:pre-line">${esc(activeRelease.changelog)}</div>` : ''}
        <div style="margin-top:12px">
          <a href="${esc(activeRelease.download_url)}" target="_blank" style="font-size:13px;color:#60a5fa;text-decoration:underline;word-break:break-all">${esc(activeRelease.download_url)}</a>
        </div>
      </div>
      ` : '<div class="card" style="margin-bottom:24px;color:var(--text-muted);text-align:center;padding:32px">Belum ada rilis APK aktif.</div>'}

      <!-- RELEASE HISTORY -->
      <div class="card">
        <h2 style="margin-bottom:16px;font-size:17px;font-weight:700">📋 Riwayat Rilis</h2>
        ${releasesData.length === 0 ? '<div class="empty">Belum ada rilis.</div>' : `
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.1)">
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600">Versi</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600">Build</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600">Ukuran</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600">Status</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600">Tanggal</th>
              <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${releasesData.map(r => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05)">
              <td style="padding:10px 12px;font-weight:700">v${esc(String(r.version_name))}</td>
              <td style="padding:10px 12px;color:var(--text-muted)">${esc(String(r.version_code))}</td>
              <td style="padding:10px 12px;color:var(--text-muted)">${fmtFileSize(r.file_size)}</td>
              <td style="padding:10px 12px">
                <span style="display:inline-flex;align-items:center;gap:5px;padding:2px 10px;border-radius:50px;font-size:11px;font-weight:700;${r.is_active ? 'background:rgba(74,222,128,0.15);color:#4ade80' : 'background:rgba(255,255,255,0.07);color:var(--text-muted)'}">
                  ${r.is_active ? '● Aktif' : '○ Tidak Aktif'}
                </span>
              </td>
              <td style="padding:10px 12px;color:var(--text-muted)">${new Date(r.created_at).toLocaleDateString('id-ID')}</td>
              <td style="padding:10px 12px">
                <div style="display:flex;gap:6px">
                  ${!r.is_active ? `<button class="btn btn-sm" onclick="activateRelease(${r.id})" style="font-size:11px;padding:4px 10px">Aktifkan</button>` : ''}
                  <a href="${esc(r.download_url)}" target="_blank" class="btn btn-sm" style="font-size:11px;padding:4px 10px;background:rgba(96,165,250,0.15);color:#60a5fa;text-decoration:none">Unduh</a>
                  <button class="btn btn-sm" onclick="deleteRelease(${r.id})" style="font-size:11px;padding:4px 10px;background:rgba(248,113,113,0.15);color:#f87171">Hapus</button>
                </div>
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        `}
      </div>
    </div>
  `;
}

function previewDriveUrl(input) {
  const preview = document.getElementById('rel-url-preview');
  if (!preview) return;
  const converted = convertDriveUrl(input.value.trim());
  if (converted && converted !== input.value.trim()) {
    preview.textContent = '→ Akan disimpan sebagai: ' + converted;
  } else {
    preview.textContent = '';
  }
}

async function submitRelease() {
  const versionName = document.getElementById('rel-version-name').value.trim();
  const versionCode = document.getElementById('rel-version-code').value.trim();
  const minAndroid  = document.getElementById('rel-min-android').value.trim();
  const changelog   = document.getElementById('rel-changelog').value.trim();
  const rawUrl      = document.getElementById('rel-url').value.trim();
  const urlInput    = convertDriveUrl(rawUrl);
  const fileInput   = document.getElementById('rel-file');
  const file        = fileInput.files[0];

  if (!versionName || !versionCode) {
    toast('Nama versi dan kode versi wajib diisi', 'error'); return;
  }
  if (!file && !urlInput) {
    toast('Pilih file APK atau masukkan URL download', 'error'); return;
  }

  const btn    = document.getElementById('rel-upload-btn');
  const label  = document.getElementById('rel-upload-label');
  const status = document.getElementById('rel-upload-status');
  btn.disabled = true;
  label.textContent = '⏳ Mengunggah...';

  let payload = {
    version_name: versionName,
    version_code: versionCode,
    min_android:  minAndroid || '7',
    changelog:    changelog || null,
    download_url: urlInput || `https://web.migxchat.net/downloads/migchat-v${versionCode}.apk`,
  };

  if (file) {
    status.textContent = 'Mengonversi file...';
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = e => resolve(e.target.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      payload.base64Data = base64Data;
      payload.mime_type  = file.type || 'application/vnd.android.package-archive';
      payload.file_name  = file.name;
      payload.file_size  = file.size;
      status.textContent = 'Mengunggah ke server...';
    } catch (e) {
      toast('Gagal membaca file', 'error');
      btn.disabled = false; label.textContent = '📦 Upload & Aktifkan'; status.textContent = '';
      return;
    }
  }

  const res = await api('/releases', { method: 'POST', body: payload });
  btn.disabled = false; label.textContent = '📦 Upload & Aktifkan'; status.textContent = '';

  if (res && res.release) {
    toast(res.message || 'Rilis APK berhasil disimpan', 'success');
    document.getElementById('rel-version-name').value = '';
    document.getElementById('rel-version-code').value = '';
    document.getElementById('rel-changelog').value = '';
    document.getElementById('rel-url').value = '';
    fileInput.value = '';
    const data = await api('/releases');
    if (data) { releasesData = data.releases || []; drawReleasesPage(document.getElementById('content')); }
  }
}

async function activateRelease(id) {
  const res = await api(`/releases/${id}/activate`, { method: 'PATCH' });
  if (res && res.release) {
    toast(res.message || 'Rilis diaktifkan', 'success');
    const data = await api('/releases');
    if (data) { releasesData = data.releases || []; drawReleasesPage(document.getElementById('content')); }
  }
}

async function deleteRelease(id) {
  confirm('Hapus Rilis APK', 'Hapus rilis APK ini? File terkait juga akan dihapus.', async () => {
    const res = await api(`/releases/${id}`, { method: 'DELETE' });
    if (res && !res.error) {
      toast(res.message || 'Rilis dihapus', 'success');
      releasesData = releasesData.filter(r => String(r.id) !== String(id));
      drawReleasesPage(document.getElementById('content'));
    } else if (res && res.error) {
      toast(res.error || 'Gagal menghapus rilis', 'error');
    }
  });
}

// ─── CREDIT HISTORY PANEL ────────────────────────────────────────────────────
let _historyUsername = '';
let _historyPage = 1;
const HISTORY_LIMIT = 40;

function openHistoryPanel() {
  document.getElementById('history-backdrop').classList.add('open');
  document.getElementById('history-panel').classList.add('open');
}
window.closeHistoryPanel = function() {
  document.getElementById('history-backdrop').classList.remove('open');
  document.getElementById('history-panel').classList.remove('open');
};

function formatHistoryItem(t) {
  const desc = t.description || '';
  const type = parseInt(t.type);
  const amount = parseFloat(t.amount);
  const absAmt = Math.round(Math.abs(amount));
  const cur = t.currency || 'IDR';
  const isIn = amount >= 0;
  const dir = isIn ? 'in' : 'out';
  const sign = isIn ? '+' : '-';
  let icon = '📋';
  let label = '';

  if (type === 33) {                        // GAME_BET
    const game = desc.replace('Game bet: ', '').replace('Game bet:', '').trim();
    label = `Game bet (${game})`;
    icon = '🎮';
  } else if (type === 34) {                 // GAME_REWARD / WIN
    const game = desc.replace('Game win: ', '').replace('Game win:', '').trim();
    label = `Game win (${game})`;
    icon = '🏆';
  } else if (type === 10) {                 // GAME_REFUND
    const game = desc.replace('Game refund: ', '').replace('Game refund:', '').trim();
    label = `Game out / refund (${game})`;
    icon = '↩️';
  } else if (type === 14) {                 // TRANSFER
    if (desc.startsWith('Transfer to ')) {
      const to = desc.slice('Transfer to '.length);
      label = `Transfer to ${to}`;
      icon = '➡️';
    } else if (desc.startsWith('Received from ')) {
      const from = desc.slice('Received from '.length);
      label = `Received from ${from}`;
      icon = '⬅️';
    } else if (desc.toLowerCase().includes('fee')) {
      label = desc;
      icon = '💸';
    } else {
      label = desc || 'Transfer';
      icon = '↔️';
    }
  } else if (type === 41) {                 // VIRTUAL_GIFT_PURCHASE (sent)
    const m = desc.match(/Gift "(.+)" dikirim ke @(.+)/);
    if (m) {
      label = `Send gift to ${m[2]} — ${m[1]}`;
    } else if (desc.startsWith('Beli gift:')) {
      label = desc;
    } else {
      label = desc || 'Virtual Gift';
    }
    icon = '🎁';
  } else if (type === 9) {                  // BONUS / TOP-UP
    label = desc || 'Bonus / Top-up';
    icon = '🎉';
  } else {
    label = desc || (TX_TYPES[type] || `Tipe ${type}`);
    icon = '📋';
  }

  const balance = t.running_balance != null ? `Saldo: ${cur} ${Math.round(parseFloat(t.running_balance)).toLocaleString('id-ID')}` : '';
  return { icon, label, dir, sign, absAmt, cur, isIn, balance, date: t.created_at };
}

function formatGiftReceivedItem(g) {
  const giftName = g.gift_name || 'Gift';
  const price = g.gift_price != null ? Math.round(parseFloat(g.gift_price)) : 0;
  const cur = g.gift_currency || 'IDR';
  const sender = g.sender || '?';
  const label = `Received gift from ${sender} — ${giftName}`;
  return { icon: '💝', label, dir: 'in', sign: '', absAmt: price, cur, isIn: true, balance: '', date: g.created_at };
}

function renderHistoryItems(items) {
  if (!items.length) return '<div class="empty">Tidak ada transaksi</div>';
  return items.map(item => `
    <div class="history-item">
      <div class="history-icon ${item.dir}">${item.icon}</div>
      <div class="history-label">
        <div class="hl-main">${esc(item.label)}</div>
        <div class="hl-sub">${fmtDateTime(item.date)}${item.balance ? ' · ' + esc(item.balance) : ''}</div>
      </div>
      <div class="history-amount ${item.dir}">
        ${item.absAmt > 0 ? item.sign + ' ' + item.cur + ' ' + item.absAmt.toLocaleString('id-ID') : '—'}
      </div>
    </div>`).join('');
}

window.showUserHistory = async function(username, page = 1) {
  _historyUsername = username;
  _historyPage = page;
  document.getElementById('history-panel-title').textContent = `Riwayat Kredit — @${username}`;
  document.getElementById('history-panel-body').innerHTML = '<div class="loading"><div class="spinner"></div>Memuat...</div>';
  document.getElementById('history-page-info').textContent = '';
  document.getElementById('history-prev-btn').style.display = 'none';
  document.getElementById('history-next-btn').style.display = 'none';
  openHistoryPanel();

  const data = await api(`/credits/user-history/${encodeURIComponent(username)}?page=${page}&limit=${HISTORY_LIMIT}`);
  if (!data) { document.getElementById('history-panel-body').innerHTML = '<div class="empty">Gagal memuat data</div>'; return; }

  // Format transactions
  const txItems = (data.transactions || []).map(formatHistoryItem);

  // Merge gifts received on page 1 (they are a separate static list)
  let allItems = [...txItems];
  if (page === 1 && data.giftsReceived && data.giftsReceived.length > 0) {
    const giftItems = data.giftsReceived.map(formatGiftReceivedItem);
    // Merge & sort by date descending
    allItems = [...txItems, ...giftItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  document.getElementById('history-panel-body').innerHTML = renderHistoryItems(allItems);

  const total = data.total || 0;
  const totalPages = Math.ceil(total / HISTORY_LIMIT);
  document.getElementById('history-page-info').textContent = `${total} transaksi · Hal. ${page}/${Math.max(1, totalPages)}`;

  const prevBtn = document.getElementById('history-prev-btn');
  const nextBtn = document.getElementById('history-next-btn');
  prevBtn.style.display = page > 1 ? '' : 'none';
  nextBtn.style.display = page < totalPages ? '' : 'none';
  prevBtn.onclick = () => showUserHistory(_historyUsername, _historyPage - 1);
  nextBtn.onclick = () => showUserHistory(_historyUsername, _historyPage + 1);
};

// ─── INIT ─────────────────────────────────────────────────────────────────────
render();
