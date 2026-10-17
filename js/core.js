// Đã gắn sẵn đường link Web App của anh Duy
window.APP_CONFIG = {
  SHEET_URL: "https://script.google.com/macros/s/AKfycbze73fc35zCRE0iJnuvh6vMBT2tRzAsEvl0BvWSG9sobdip4sMR6sWUUYEpZ1ZHiM_3/exec",
  GEMINI_KEY: ""
};

window.SafeStore = {
  mem: {},
  get(k) { try { return localStorage.getItem(k) || this.mem[k] || null; } catch(e) { return this.mem[k] || null; } },
  set(k, v) { this.mem[k] = v; try { localStorage.setItem(k, v); } catch(e) {} },
  remove(k) { delete this.mem[k]; try { localStorage.removeItem(k); } catch(e) {} }
};

// Tự động lưu link cấu hình vào bộ nhớ máy
window.SafeStore.set('docugen_cfg_sheet', window.APP_CONFIG.SHEET_URL);

window.currentUserRole = 'employee';
window.currentAppUsername = '';
window.currentAppFullName = '';

window.DEFAULT_COMPANY = {
  name: "CÔNG TY TNHH PHẠM DUY KHANG",
  address: "860/84A Xô Viết Nghệ Tĩnh, Phường Thạnh Mỹ Tây, TP. Hồ Chí Minh",
  branch: "A34/9JS Quốc Lộ 50, Phường Bình Hưng, TP. HCM",
  phone: "0986.450.025",
  taxCode: "0310085652"
};

window.showToast = function(msg, type="info") {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div');
  t.className = `px-4 py-3 rounded-lg text-sm font-bold text-white mb-2 shadow-lg transition-all duration-300 transform translate-x-0 flex items-center gap-2 ${type==='error'?'bg-rose-600':(type==='success'?'bg-emerald-600':'bg-slate-800')}`;
  t.innerHTML = `<i class="fa-solid ${type==='error'?'fa-circle-xmark':(type==='success'?'fa-circle-check':'fa-circle-info')}"></i> ${msg}`; 
  c.appendChild(t);
  setTimeout(()=>t.remove(), 3500);
};

// Hàm chuẩn hóa ngày tháng từ Google Sheets
function formatSheetDate(val) {
  if (!val) return '';
  const str = String(val);
  if (str.includes('T') && str.includes('Z')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('vi-VN');
  }
  return str;
}

// KẾT NỐI CLOUD (GOOGLE SHEETS)
window.cloudSync = async function(action, payload = null, id = null) {
  const url = window.APP_CONFIG.SHEET_URL || window.SafeStore.get('docugen_cfg_sheet');
  if (!url) return null; 
  try {
    const iconEl = document.getElementById('cloudStatusIcon');
    const textEl = document.getElementById('cloudStatusText');
    if (iconEl) iconEl.className = 'fa-solid fa-arrows-rotate fa-spin text-amber-400';
    if (textEl) textEl.innerText = 'Đang đồng bộ...';

    const req = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload, id })
    });
    const res = await req.json();

    if (res.status === 'error') {
      if (iconEl) iconEl.className = 'fa-solid fa-cloud-xmark text-rose-400';
      if (textEl) textEl.innerText = 'Lỗi Script';
      window.showToast("Lỗi từ Sheet: " + res.message, "error");
      return null;
    }

    if (iconEl) iconEl.className = 'fa-solid fa-cloud-check text-emerald-400';
    if (textEl) textEl.innerText = 'Online Ready';
    return res.data;
  } catch(e) {
    const iconEl = document.getElementById('cloudStatusIcon');
    const textEl = document.getElementById('cloudStatusText');
    if (iconEl) iconEl.className = 'fa-solid fa-cloud-xmark text-rose-400';
    if (textEl) textEl.innerText = 'Lỗi kết nối';
    return null;
  }
};

window.doFullSync = async function() {
  const data = await window.cloudSync('SYNC');
  if (!data) return false;
  
  if (data.users) {
    let localUsers = {};
    for (let k in data.users) {
      const cleanKey = String(k).trim();
      if (!cleanKey) continue;
      localUsers[cleanKey] = {
        password: String(data.users[k].Password ?? '').trim(),
        fullName: String(data.users[k].FullName ?? cleanKey).trim(),
        role: String(data.users[k].Role ?? 'employee').trim().toLowerCase()
      };
    }
    if (Object.keys(localUsers).length > 0) {
      window.SafeStore.set('docugen_users', JSON.stringify(localUsers));
    }
  }

  if (data.customers) {
    let localCust = {};
    for (let k in data.customers) {
      let c = data.customers[k];
      let parsed = {};
      try { parsed = typeof c.Data_JSON === 'string' ? JSON.parse(c.Data_JSON || '{}') : (c.Data_JSON || {}); } catch(e){}
      localCust[String(k).trim()] = {
        ...parsed,
        name: String(c.TenKH ?? ''),
        phone: String(c.SDT ?? '')
      };
    }
    window.SafeStore.set('docugen_customers', JSON.stringify(localCust));
  }

  if (data.orders) {
    let localOrders = {};
    for (let k in data.orders) {
      let o = data.orders[k];
      let parsed = {};
      try { parsed = typeof o.Data_JSON === 'string' ? JSON.parse(o.Data_JSON || '{}') : (o.Data_JSON || {}); } catch(e){}
      const formattedTotal = typeof o.TongTien === 'number' ? o.TongTien.toLocaleString('vi-VN') : String(o.TongTien ?? '0');
      localOrders[String(k).trim()] = {
        ...parsed,
        mode: String(o.LoaiPhieu || 'quote').trim(),
        date: formatSheetDate(o.NgayLap),
        customerName: String(o.TenKH ?? ''),
        total: formattedTotal
      };
    }
    window.SafeStore.set('docugen_orders', JSON.stringify(localOrders));
  }
  return true;
};

// XỬ LÝ ĐĂNG NHẬP & PHÂN QUYỀN
window.initAppAuth = async function() {
  const loadingEl = document.getElementById('authLoadingOverlay');
  if (loadingEl) loadingEl.classList.remove('hidden');

  await window.doFullSync();

  if (loadingEl) loadingEl.classList.add('hidden');

  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  if (Object.keys(users).length === 0) { 
    document.getElementById('setupAdminBox').classList.remove('hidden'); 
    document.getElementById('loginBox').classList.add('hidden');
  } else {
    document.getElementById('setupAdminBox').classList.add('hidden');
    const session = JSON.parse(window.SafeStore.get('docugen_auth_session') || 'null');
    if (session && users[session.user]) { 
      window.loginSuccess(session.user, users[session.user].role); 
    } else { 
      document.getElementById('loginBox').classList.remove('hidden'); 
    }
  }
};

window.loginSuccess = function(username, role) {
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  window.currentAppUsername = username;
  window.currentUserRole = role;
  window.currentAppFullName = (users[username] && users[username].fullName) ? users[username].fullName : username;

  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('setupAdminBox').classList.add('hidden');
  document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('uiCurrentUserName').innerText = window.currentAppFullName;
  document.getElementById('uiCurrentUserRole').innerText = role;

  const adminEls = document.querySelectorAll('.admin-only');
  adminEls.forEach(el => el.style.display = role === 'employee' ? 'none' : '');
  document.getElementById('docCreatorInput').value = window.currentAppFullName;
  document.getElementById('docTerms').value = window.tabNotes ? window.tabNotes['quote'] : '';

  window.loadCompanyInfoFromCloud();
  window.loadSystemSettings();
  if (window.initDefaultDocMeta) window.initDefaultDocMeta();
  if (window.updateModeUI) window.updateModeUI();
  if (window.renderDocPreview) window.renderDocPreview();
  if (window.fitZoomScreen) window.fitZoomScreen();
};

window.logoutApp = function() { window.SafeStore.remove('docugen_auth_session'); location.reload(); };

document.getElementById('formSetupAdmin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('regAdminFullName').value.trim();
  const user = document.getElementById('regAdminUser').value.trim();
  const pass = document.getElementById('regAdminPass').value.trim();
  if(!user || !pass) return;
  let users = { [user]: { password: pass, role: 'admin', fullName: fullName } };
  window.SafeStore.set('docugen_users', JSON.stringify(users));
  await window.cloudSync('SAVE_USER', { Username: user, Password: pass, FullName: fullName, Role: 'admin' });
  window.showToast("Khởi tạo Admin thành công!", "success");
  window.SafeStore.set('docugen_auth_session', JSON.stringify({ user: user }));
  window.loginSuccess(user, 'admin');
});

document.getElementById('formLogin').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  if (users[user] && String(users[user].password).trim() === pass) {
    window.showToast(`Đăng nhập thành công!`, "success");
    window.SafeStore.set('docugen_auth_session', JSON.stringify({ user: user }));
    window.loginSuccess(user, users[user].role);
  } else {
    window.showToast("Tên đăng nhập hoặc mật khẩu sai!", "error");
  }
});

window.showForgotPass = () => { document.getElementById('loginBox').classList.add('hidden'); document.getElementById('forgotPassBox').classList.remove('hidden'); };
window.hideForgotPass = () => { document.getElementById('forgotPassBox').classList.add('hidden'); document.getElementById('loginBox').classList.remove('hidden'); };
document.getElementById('formForgotPass').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('resetUser').value.trim();
  const secret = document.getElementById('resetSecret').value;
  const newPass = document.getElementById('resetNewPass').value.trim();
  if (secret !== "phamduykhang") { window.showToast("Sai mã bí mật!", "error"); return; }
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  if(!users[user]) { window.showToast("Tên đăng nhập không tồn tại!", "error"); return; }
  users[user].password = newPass;
  window.SafeStore.set('docugen_users', JSON.stringify(users));
  await window.cloudSync('SAVE_USER', { Username: user, Password: newPass, FullName: users[user].fullName, Role: users[user].role });
  window.showToast("Đổi mật khẩu thành công! Hãy đăng nhập lại.", "success");
  window.hideForgotPass();
  document.getElementById('loginUser').value = user;
  document.getElementById('loginPass').value = '';
});

// QUẢN LÝ NHÂN SỰ & CÀI ĐẶT
window.openSystemSettingsModal = () => { document.getElementById('systemSettingsModal').classList.remove('hidden'); };
window.closeSystemSettingsModal = () => { document.getElementById('systemSettingsModal').classList.add('hidden'); };
window.loadSystemSettings = () => {
  document.getElementById('configSheetUrl').value = window.APP_CONFIG.SHEET_URL || window.SafeStore.get('docugen_cfg_sheet') || '';
  document.getElementById('configGeminiKey').value = window.APP_CONFIG.GEMINI_KEY || window.SafeStore.get('docugen_cfg_ai') || '';
};
window.saveSystemSettings = async () => {
  const sUrl = document.getElementById('configSheetUrl').value.trim();
  const gKey = document.getElementById('configGeminiKey').value.trim();
  if (sUrl) { window.APP_CONFIG.SHEET_URL = sUrl; window.SafeStore.set('docugen_cfg_sheet', sUrl); }
  window.APP_CONFIG.GEMINI_KEY = gKey;
  window.SafeStore.set('docugen_cfg_ai', gKey);
  window.showToast("Lưu cấu hình thành công!", "success");
  window.closeSystemSettingsModal();
  await window.doFullSync();
};

document.getElementById('formAddEmployee').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('newEmpFullName').value.trim();
  const user = document.getElementById('newEmpUser').value.trim();
  const pass = document.getElementById('newEmpPass').value.trim();
  if(!user || !pass || !fullName) return;
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  if (users[user]) { window.showToast("Tài khoản đã tồn tại!", "error"); return; }
  users[user] = { password: pass, role: 'employee', fullName: fullName };
  window.SafeStore.set('docugen_users', JSON.stringify(users));
  await window.cloudSync('SAVE_USER', { Username: user, Password: pass, FullName: fullName, Role: 'employee' });
  window.showToast(`Đã cấp tài khoản: ${user}`, "success");
  document.getElementById('newEmpFullName').value = '';
  document.getElementById('newEmpUser').value = '';
  document.getElementById('newEmpPass').value = '';
  window.loadEmployees();
});
window.openEmployeeModal = () => { document.getElementById('employeeModal').classList.remove('hidden'); window.loadEmployees(); };
window.closeEmployeeModal = () => document.getElementById('employeeModal').classList.add('hidden');
window.loadEmployees = () => {
  const listEl = document.getElementById('employeeList');
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  let html = '';
  for (const [id, data] of Object.entries(users)) {
    const roleStr = data.role === 'admin' ? '<span class="text-rose-600 font-bold">Admin</span>' : '<span class="text-blue-600 font-bold">Nhân viên</span>';
    const delBtn = data.role === 'employee' ? `<button onclick="window.deleteEmployee('${id}')" class="text-rose-500 text-xs px-2"><i class="fa-solid fa-trash"></i></button>` : '';
    const nameDisp = data.fullName ? `${data.fullName} (${id})` : id;
    html += `<div class="flex justify-between items-center p-2 bg-white border-b border-slate-100"><div><strong class="text-slate-800">${nameDisp}</strong><span class="text-[10px] text-slate-500 ml-2">MK: ${data.password}</span></div><div class="flex items-center gap-2">${roleStr} ${delBtn}</div></div>`;
  }
  listEl.innerHTML = html || 'Trống';
};
window.deleteEmployee = async function(username) {
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  delete users[username];
  window.SafeStore.set('docugen_users', JSON.stringify(users));
  await window.cloudSync('DELETE_USER', null, username);
  window.showToast("Đã xóa nhân viên", "info");
  window.loadEmployees();
};

// THÔNG TIN CÔNG TY
window.loadCompanyInfoFromCloud = function() {
  let data = JSON.parse(window.SafeStore.get('docugen_company') || 'null') || window.DEFAULT_COMPANY;
  document.getElementById('sellerName').value = data.name || '';
  document.getElementById('sellerAddress').value = data.address || '';
  document.getElementById('sellerBranch').value = data.branch || '';
  document.getElementById('sellerPhone').value = data.phone || '';
  document.getElementById('sellerTaxCode').value = data.taxCode || '';
  window.syncCompanyReadOnlyView();
};
window.saveCompanyInfoToCloud = function() {
  if (window.currentUserRole !== 'admin') return;
  let data = {
    name: document.getElementById('sellerName').value || window.DEFAULT_COMPANY.name,
    address: document.getElementById('sellerAddress').value || window.DEFAULT_COMPANY.address,
    branch: document.getElementById('sellerBranch').value || window.DEFAULT_COMPANY.branch,
    phone: document.getElementById('sellerPhone').value || window.DEFAULT_COMPANY.phone,
    taxCode: document.getElementById('sellerTaxCode').value || window.DEFAULT_COMPANY.taxCode
  };
  window.SafeStore.set('docugen_company', JSON.stringify(data));
  window.showToast("Đã lưu Công ty!", "success");
  window.toggleCompanyEditMode();
  window.renderDocPreview();
};
window.syncCompanyReadOnlyView = function() {
  document.getElementById('roCompanyName').innerText = document.getElementById('sellerName').value || window.DEFAULT_COMPANY.name;
  document.getElementById('roCompanyAddress').innerText = document.getElementById('sellerAddress').value || window.DEFAULT_COMPANY.address;
  document.getElementById('roCompanyBranch').innerText = document.getElementById('sellerBranch').value || window.DEFAULT_COMPANY.branch;
  document.getElementById('roCompanyHotline').innerText = document.getElementById('sellerPhone').value || window.DEFAULT_COMPANY.phone;
  document.getElementById('roCompanyTax').innerText = document.getElementById('sellerTaxCode').value || window.DEFAULT_COMPANY.taxCode;
};
window.toggleCompanyEditMode = function() {
  window.isCompanyEditing = !window.isCompanyEditing;
  document.getElementById('companyReadOnlyView').classList.toggle('hidden', window.isCompanyEditing);
  document.getElementById('companyEditFormView').classList.toggle('hidden', !window.isCompanyEditing);
  document.getElementById('btnToggleCompanyEdit').innerHTML = window.isCompanyEditing ? '<i class="fa-solid fa-xmark"></i> Hủy sửa' : '<i class="fa-solid fa-pen"></i> Chỉnh sửa';
  if(!window.isCompanyEditing) window.syncCompanyReadOnlyView();
};

// QUẢN LÝ KHÁCH HÀNG DB
window.openCustomerModal = () => { document.getElementById('customerModal').classList.remove('hidden'); window.renderCustomerList(); };
window.closeCustomerModal = () => document.getElementById('customerModal').classList.add('hidden');
window.renderCustomerList = (search = '') => {
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}');
  let html = '';
  const searchLower = String(search || '').toLowerCase();
  for (let key in custData) {
    let c = custData[key];
    const cName = String(c.name || '');
    const cPhone = String(c.phone || '');
    if (searchLower && !cName.toLowerCase().includes(searchLower) && !cPhone.toLowerCase().includes(searchLower)) continue;
    html += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors"><td class="p-3 font-bold text-slate-800">${cName}</td><td class="p-3">${cPhone}</td><td class="p-3 text-xs text-slate-500 truncate max-w-[200px]" title="${c.address||''}">${c.address || ''}</td><td class="p-3 text-right"><button onclick="window.selectCustomerById('${key}')" class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold mr-1 transition"><i class="fa-solid fa-check"></i> Chọn</button>${window.currentUserRole==='admin' ? `<button onclick="window.deleteCustomer('${key}')" class="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`;
  }
  document.getElementById('customerListBody').innerHTML = html || '<tr><td colspan="4" class="text-center p-8 text-slate-400 font-medium">Chưa có khách hàng nào</td></tr>';
};

window.saveCustomerToCloud = async function() {
  const name = document.getElementById('custName').value.trim();
  if (!name) { window.showToast("Nhập tên KH!", "error"); return; }
  let id = document.getElementById('currentCustomerId').value || 'KH' + Date.now();
  let customerPayload = {
    name,
    taxId: document.getElementById('custTaxId').value,
    companyPhone: document.getElementById('custCompanyPhone').value,
    email: document.getElementById('custEmail').value,
    address: document.getElementById('custAddress').value,
    contactPerson: document.getElementById('contactPerson').value,
    phone: document.getElementById('custPhone').value,
    deliveryAddress: document.getElementById('deliveryAddress').value,
    deliveryTime: document.getElementById('deliveryTime').value,
    sameAddress: document.getElementById('sameAddressCheckbox').checked
  };
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}');
  custData[id] = customerPayload;
  window.SafeStore.set('docugen_customers', JSON.stringify(custData));
  document.getElementById('currentCustomerId').value = id;
  window.showToast("Đã lưu Khách hàng", "success");
  let jsonPayload = JSON.stringify({
    taxId: customerPayload.taxId,
    companyPhone: customerPayload.companyPhone,
    email: customerPayload.email,
    address: customerPayload.address,
    contactPerson: customerPayload.contactPerson,
    deliveryAddress: customerPayload.deliveryAddress,
    deliveryTime: customerPayload.deliveryTime,
    sameAddress: customerPayload.sameAddress
  });
  await window.cloudSync('SAVE_CUSTOMER', { ID: id, TenKH: name, SDT: customerPayload.phone, Data_JSON: jsonPayload });
};

window.deleteCustomer = async function(id) {
  if(!confirm("Bạn chắc chắn muốn xóa khách hàng này?")) return;
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}');
  delete custData[id];
  window.SafeStore.set('docugen_customers', JSON.stringify(custData));
  window.renderCustomerList(document.getElementById('searchCustomerInput').value);
  window.showToast("Đã xóa KH", "info");
  await window.cloudSync('DELETE_CUSTOMER', null, id);
};

// QUẢN LÝ ĐƠN HÀNG DB
window.openOrderModal = () => { document.getElementById('orderModal').classList.remove('hidden'); window.renderOrderList(); };
window.closeOrderModal = () => document.getElementById('orderModal').classList.add('hidden');
window.renderOrderList = () => {
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}');
  let html = '';
  const sortedKeys = Object.keys(orders).sort().reverse();
  sortedKeys.forEach(key => {
    let o = orders[key];
    let statusClass = o.mode === 'quote' ? 'bg-blue-100 text-blue-700' : (o.mode === 'order' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700');
    let statusText = o.mode === 'quote' ? 'Báo giá' : (o.mode === 'order' ? 'Đặt hàng' : 'Giao hàng');
    html += `<tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onclick="window.loadOrder('${key}')"><td class="p-3 font-mono font-bold text-xs text-slate-600">${key}</td><td class="p-3 text-xs text-slate-500">${o.date || ''}</td><td class="p-3 font-bold text-slate-800 text-xs truncate max-w-[200px]" title="${o.customerName || ''}">${o.customerName || ''}</td><td class="p-3 font-mono font-bold text-rose-600 text-right">${o.total || '0'} đ</td><td class="p-3 text-center"><span class="px-2 py-1 rounded-md text-[10px] font-bold ${statusClass}">${statusText}</span></td><td class="p-3 text-right"><button onclick="event.stopPropagation(); window.deleteOrder('${key}')" class="text-rose-400 hover:text-rose-600 px-2 py-1"><i class="fa-solid fa-trash"></i></button></td></tr>`;
  });
  document.getElementById('orderListBody').innerHTML = html || '<tr><td colspan="6" class="text-center p-8 text-slate-400 font-medium">Chưa có đơn hàng nào được lưu.</td></tr>';
};

window.saveOrderToCloud = async () => {
  const isNew = !window.currentOrderId;
  if (isNew) {
    const now = new Date();
    const pfx = window.activeDocMode === 'quote' ? 'BG' : (window.activeDocMode === 'order' ? 'ĐH' : 'GH');
    const num = `${now.getFullYear()}${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    window.currentOrderId = `${pfx}-${num}`;
    window.currentOrderDate = now.toLocaleDateString('vi-VN');
  }
  let orderData = {
    mode: window.activeDocMode,
    date: window.currentOrderDate,
    customerName: document.getElementById('custName').value,
    taxId: document.getElementById('custTaxId').value,
    companyPhone: document.getElementById('custCompanyPhone').value,
    email: document.getElementById('custEmail').value,
    address: document.getElementById('custAddress').value,
    contactPerson: document.getElementById('contactPerson').value,
    phone: document.getElementById('custPhone').value,
    deliveryAddress: document.getElementById('deliveryAddress').value,
    deliveryTime: document.getElementById('deliveryTime').value,
    sameAddress: document.getElementById('sameAddressCheckbox').checked,
    customerId: document.getElementById('currentCustomerId').value,
    items: JSON.parse(JSON.stringify(window.itemsList)),
    total: document.getElementById('displayGrandTotal').innerText.replace(' đ', ''),
    quoteSumMode: window.quoteSumMode,
    depositType: window.depositType,
    depositPercent: document.getElementById('depositPercent').value,
    depositAmount: document.getElementById('depositFixedAmountInput').value,
    terms: document.getElementById('docTerms').value,
    vat: document.getElementById('vatSelect').value
  };
  
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}');
  orders[window.currentOrderId] = orderData;
  window.SafeStore.set('docugen_orders', JSON.stringify(orders));
  window.initDefaultDocMeta();
  window.renderDocPreview();
