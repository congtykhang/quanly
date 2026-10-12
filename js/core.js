window.SafeStore = {
  mem: {},
  get(k) { try { return localStorage.getItem(k) || this.mem[k] || null; } catch(e) { return this.mem[k] || null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch(e) { this.mem[k] = v; } },
  remove(k) { try { localStorage.removeItem(k); } catch(e) { delete this.mem[k]; } }
};

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
  const c = document.getElementById('toast-container'); const t = document.createElement('div');
  t.className = `px-4 py-3 rounded-lg text-sm font-bold text-white mb-2 shadow-lg transition-all duration-300 transform translate-x-0 flex items-center gap-2 ${type==='error'?'bg-rose-600':(type==='success'?'bg-emerald-600':'bg-slate-800')}`;
  t.innerHTML = `<i class="fa-solid ${type==='error'?'fa-circle-xmark':(type==='success'?'fa-circle-check':'fa-circle-info')}"></i> ${msg}`; 
  c.appendChild(t); setTimeout(()=>t.remove(), 3000);
}

// KẾT NỐI CLOUD (GOOGLE SHEETS)
window.cloudSync = async function(action, payload = null, id = null) {
  const url = window.SafeStore.get('docugen_cfg_sheet');
  if (!url) return null; 
  try {
    document.getElementById('cloudStatusIcon').className = 'fa-solid fa-arrows-rotate fa-spin text-amber-400';
    document.getElementById('cloudStatusText').innerText = 'Đang đồng bộ...';
    const req = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, payload, id }) });
    const res = await req.json();
    document.getElementById('cloudStatusIcon').className = 'fa-solid fa-cloud-check text-emerald-400';
    document.getElementById('cloudStatusText').innerText = 'Online Ready';
    return res.data;
  } catch(e) {
    document.getElementById('cloudStatusIcon').className = 'fa-solid fa-cloud-xmark text-rose-400';
    document.getElementById('cloudStatusText').innerText = 'Lỗi kết nối';
    return null;
  }
}

window.doFullSync = async function() {
  const url = window.SafeStore.get('docugen_cfg_sheet');
  if (!url) { document.getElementById('cloudStatusText').innerText = 'Local Only'; return; }
  const data = await window.cloudSync('SYNC');
  if (!data) return;
  if (data.users) {
    let localUsers = {};
    for (let k in data.users) { localUsers[k] = { password: data.users[k].Password, fullName: data.users[k].FullName, role: data.users[k].Role }; }
    if(Object.keys(localUsers).length > 0) window.SafeStore.set('docugen_users', JSON.stringify(localUsers));
  }
  if (data.customers) {
    let localCust = {};
    for (let k in data.customers) {
      let c = data.customers[k]; let parsed = {}; try { parsed = JSON.parse(c.Data_JSON || '{}'); } catch(e){}
      localCust[k] = { name: c.TenKH, phone: c.SDT, ...parsed };
    }
    window.SafeStore.set('docugen_customers', JSON.stringify(localCust));
  }
  if (data.orders) {
    let localOrders = {};
    for (let k in data.orders) {
      let o = data.orders[k]; let parsed = {}; try { parsed = JSON.parse(o.Data_JSON || '{}'); } catch(e){}
      localOrders[k] = { mode: o.LoaiPhieu, date: o.NgayLap, customerName: o.TenKH, total: o.TongTien, ...parsed };
    }
    window.SafeStore.set('docugen_orders', JSON.stringify(localOrders));
  }
}

// XỬ LÝ ĐĂNG NHẬP & PHÂN QUYỀN
window.initAppAuth = function() {
  document.getElementById('authLoadingOverlay').classList.add('hidden');
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  if (Object.keys(users).length === 0) { document.getElementById('setupAdminBox').classList.remove('hidden'); } 
  else {
    const session = JSON.parse(window.SafeStore.get('docugen_auth_session') || 'null');
    if (session && users[session.user]) { window.loginSuccess(session.user, users[session.user].role); }
    else { document.getElementById('loginBox').classList.remove('hidden'); }
  }
}

window.loginSuccess = function(username, role) {
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  window.currentAppUsername = username; window.currentUserRole = role;
  window.currentAppFullName = (users[username] && users[username].fullName) ? users[username].fullName : username;

  document.getElementById('authOverlay').classList.add('hidden');
  document.getElementById('setupAdminBox').classList.add('hidden'); document.getElementById('loginBox').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');
  document.getElementById('uiCurrentUserName').innerText = window.currentAppFullName;
  document.getElementById('uiCurrentUserRole').innerText = role;

  const adminEls = document.querySelectorAll('.admin-only'); adminEls.forEach(el => el.style.display = role === 'employee' ? 'none' : '');
  document.getElementById('docCreatorInput').value = window.currentAppFullName; document.getElementById('docTerms').value = window.tabNotes['quote'];

  window.loadCompanyInfoFromCloud(); window.loadSystemSettings();
  window.initDefaultDocMeta(); window.updateModeUI(); window.renderDocPreview(); window.fitZoomScreen();
  window.doFullSync();
}

window.logoutApp = function() { window.SafeStore.remove('docugen_auth_session'); location.reload(); };

document.getElementById('formSetupAdmin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('regAdminFullName').value.trim(); const user = document.getElementById('regAdminUser').value.trim(); const pass = document.getElementById('regAdminPass').value.trim();
  if(!user || !pass) return;
  let users = { [user]: { password: pass, role: 'admin', fullName: fullName } };
  window.SafeStore.set('docugen_users', JSON.stringify(users));
  await window.cloudSync('SAVE_USER', { Username: user, Password: pass, FullName: fullName, Role: 'admin' });
  window.showToast("Khởi tạo Admin thành công!", "success"); window.SafeStore.set('docugen_auth_session', JSON.stringify({ user: user })); window.loginSuccess(user, 'admin');
});

document.getElementById('formLogin').addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('loginUser').value.trim(); const pass = document.getElementById('loginPass').value.trim();
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  if (users[user] && users[user].password === pass) {
    window.showToast(`Đăng nhập thành công!`, "success"); window.SafeStore.set('docugen_auth_session', JSON.stringify({ user: user })); window.loginSuccess(user, users[user].role);
  } else { window.showToast("Tên đăng nhập hoặc mật khẩu sai!", "error"); }
});

window.showForgotPass = () => { document.getElementById('loginBox').classList.add('hidden'); document.getElementById('forgotPassBox').classList.remove('hidden'); };
window.hideForgotPass = () => { document.getElementById('forgotPassBox').classList.add('hidden'); document.getElementById('loginBox').classList.remove('hidden'); };
document.getElementById('formForgotPass').addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = document.getElementById('resetUser').value.trim(); const secret = document.getElementById('resetSecret').value; const newPass = document.getElementById('resetNewPass').value;
  if (secret !== "phamduykhang") { window.showToast("Sai mã bí mật!", "error"); return; }
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  if(!users[user]) { window.showToast("Tên đăng nhập không tồn tại!", "error"); return; }
  users[user].password = newPass; window.SafeStore.set('docugen_users', JSON.stringify(users));
  await window.cloudSync('SAVE_USER', { Username: user, Password: newPass, FullName: users[user].fullName, Role: users[user].role });
  window.showToast("Đổi mật khẩu thành công! Hãy đăng nhập lại.", "success");
  window.hideForgotPass(); document.getElementById('loginUser').value = user; document.getElementById('loginPass').value = '';
});

// QUẢN LÝ NHÂN SỰ & CÀI ĐẶT
window.openSystemSettingsModal = () => { document.getElementById('systemSettingsModal').classList.remove('hidden'); };
window.closeSystemSettingsModal = () => { document.getElementById('systemSettingsModal').classList.add('hidden'); };
window.loadSystemSettings = () => { document.getElementById('configSheetUrl').value = window.SafeStore.get('docugen_cfg_sheet') || ''; document.getElementById('configGeminiKey').value = window.SafeStore.get('docugen_cfg_ai') || ''; }
window.saveSystemSettings = () => { window.SafeStore.set('docugen_cfg_sheet', document.getElementById('configSheetUrl').value.trim()); window.SafeStore.set('docugen_cfg_ai', document.getElementById('configGeminiKey').value.trim()); window.showToast("Lưu cấu hình thành công!", "success"); window.closeSystemSettingsModal(); window.doFullSync(); };

document.getElementById('formAddEmployee').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fullName = document.getElementById('newEmpFullName').value.trim(); const user = document.getElementById('newEmpUser').value.trim(); const pass = document.getElementById('newEmpPass').value.trim();
  if(!user || !pass || !fullName) return;
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}');
  if (users[user]) { window.showToast("Tài khoản đã tồn tại!", "error"); return; }
  users[user] = { password: pass, role: 'employee', fullName: fullName }; window.SafeStore.set('docugen_users', JSON.stringify(users));
  await window.cloudSync('SAVE_USER', { Username: user, Password: pass, FullName: fullName, Role: 'employee' });
  window.showToast(`Đã cấp tài khoản: ${user}`, "success");
  document.getElementById('newEmpFullName').value = ''; document.getElementById('newEmpUser').value = ''; document.getElementById('newEmpPass').value = ''; window.loadEmployees();
});
window.openEmployeeModal = () => { document.getElementById('employeeModal').classList.remove('hidden'); window.loadEmployees(); };
window.closeEmployeeModal = () => document.getElementById('employeeModal').classList.add('hidden');
window.loadEmployees = () => {
  const listEl = document.getElementById('employeeList'); let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}'); let html = '';
  for (const [id, data] of Object.entries(users)) {
    const roleStr = data.role === 'admin' ? '<span class="text-rose-600 font-bold">Admin</span>' : '<span class="text-blue-600 font-bold">Nhân viên</span>';
    const delBtn = data.role === 'employee' ? `<button onclick="window.deleteEmployee('${id}')" class="text-rose-500 text-xs px-2"><i class="fa-solid fa-trash"></i></button>` : '';
    const nameDisp = data.fullName ? `${data.fullName} (${id})` : id;
    html += `<div class="flex justify-between items-center p-2 bg-white border-b border-slate-100"><div><strong class="text-slate-800">${nameDisp}</strong><span class="text-[10px] text-slate-500 ml-2">MK: ${data.password}</span></div><div class="flex items-center gap-2">${roleStr} ${delBtn}</div></div>`;
  }
  listEl.innerHTML = html || 'Trống';
}
window.deleteEmployee = async function(username) {
  let users = JSON.parse(window.SafeStore.get('docugen_users') || '{}'); delete users[username]; window.SafeStore.set('docugen_users', JSON.stringify(users));
  await window.cloudSync('DELETE_USER', null, username); window.showToast("Đã xóa nhân viên", "info"); window.loadEmployees();
};

// THÔNG TIN CÔNG TY
window.loadCompanyInfoFromCloud = function() {
  let data = JSON.parse(window.SafeStore.get('docugen_company') || 'null') || window.DEFAULT_COMPANY;
  document.getElementById('sellerName').value = data.name || ''; document.getElementById('sellerAddress').value = data.address || '';
  document.getElementById('sellerBranch').value = data.branch || ''; document.getElementById('sellerPhone').value = data.phone || ''; document.getElementById('sellerTaxCode').value = data.taxCode || '';
  window.syncCompanyReadOnlyView();
}
window.saveCompanyInfoToCloud = function() {
  if (window.currentUserRole !== 'admin') return;
  let data = { name: document.getElementById('sellerName').value || window.DEFAULT_COMPANY.name, address: document.getElementById('sellerAddress').value || window.DEFAULT_COMPANY.address, branch: document.getElementById('sellerBranch').value || window.DEFAULT_COMPANY.branch, phone: document.getElementById('sellerPhone').value || window.DEFAULT_COMPANY.phone, taxCode: document.getElementById('sellerTaxCode').value || window.DEFAULT_COMPANY.taxCode };
  window.SafeStore.set('docugen_company', JSON.stringify(data)); window.showToast("Đã lưu Công ty!", "success"); window.toggleCompanyEditMode(); window.renderDocPreview();
};
window.syncCompanyReadOnlyView = function() {
  document.getElementById('roCompanyName').innerText = document.getElementById('sellerName').value || window.DEFAULT_COMPANY.name; document.getElementById('roCompanyAddress').innerText = document.getElementById('sellerAddress').value || window.DEFAULT_COMPANY.address; document.getElementById('roCompanyBranch').innerText = document.getElementById('sellerBranch').value || window.DEFAULT_COMPANY.branch; document.getElementById('roCompanyHotline').innerText = document.getElementById('sellerPhone').value || window.DEFAULT_COMPANY.phone; document.getElementById('roCompanyTax').innerText = document.getElementById('sellerTaxCode').value || window.DEFAULT_COMPANY.taxCode;
}
window.toggleCompanyEditMode = function() {
  window.isCompanyEditing = !window.isCompanyEditing;
  document.getElementById('companyReadOnlyView').classList.toggle('hidden', window.isCompanyEditing); document.getElementById('companyEditFormView').classList.toggle('hidden', !window.isCompanyEditing);
  document.getElementById('btnToggleCompanyEdit').innerHTML = window.isCompanyEditing ? '<i class="fa-solid fa-xmark"></i> Hủy sửa' : '<i class="fa-solid fa-pen"></i> Chỉnh sửa';
  if(!window.isCompanyEditing) window.syncCompanyReadOnlyView();
};

// QUẢN LÝ KHÁCH HÀNG DB
window.openCustomerModal = () => { document.getElementById('customerModal').classList.remove('hidden'); window.renderCustomerList(); };
window.closeCustomerModal = () => document.getElementById('customerModal').classList.add('hidden');
window.renderCustomerList = (search = '') => {
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}'); let html = ''; const searchLower = search.toLowerCase();
  for (let key in custData) {
    let c = custData[key]; if (search && !c.name.toLowerCase().includes(searchLower) && !(c.phone && c.phone.includes(searchLower))) continue;
    html += `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors"><td class="p-3 font-bold text-slate-800">${c.name}</td><td class="p-3">${c.phone || ''}</td><td class="p-3 text-xs text-slate-500 truncate max-w-[200px]" title="${c.address||''}">${c.address || ''}</td><td class="p-3 text-right"><button onclick="window.selectCustomerById('${key}')" class="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold mr-1 transition"><i class="fa-solid fa-check"></i> Chọn</button>${window.currentUserRole==='admin' ? `<button onclick="window.deleteCustomer('${key}')" class="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs transition"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`;
  }
  document.getElementById('customerListBody').innerHTML = html || '<tr><td colspan="4" class="text-center p-8 text-slate-400 font-medium">Chưa có khách hàng nào</td></tr>';
};

window.saveCustomerToCloud = async function() {
  const name = document.getElementById('custName').value.trim(); if (!name) { window.showToast("Nhập tên KH!", "error"); return; }
  let id = document.getElementById('currentCustomerId').value || 'KH' + Date.now();
  let customerPayload = { name, taxId: document.getElementById('custTaxId').value, companyPhone: document.getElementById('custCompanyPhone').value, email: document.getElementById('custEmail').value, address: document.getElementById('custAddress').value, contactPerson: document.getElementById('contactPerson').value, phone: document.getElementById('custPhone').value, deliveryAddress: document.getElementById('deliveryAddress').value, deliveryTime: document.getElementById('deliveryTime').value, sameAddress: document.getElementById('sameAddressCheckbox').checked };
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}'); custData[id] = customerPayload; window.SafeStore.set('docugen_customers', JSON.stringify(custData));
  document.getElementById('currentCustomerId').value = id; window.showToast("Đã lưu Khách hàng cục bộ", "success");
  let jsonPayload = JSON.stringify({ taxId: customerPayload.taxId, companyPhone: customerPayload.companyPhone, email: customerPayload.email, address: customerPayload.address, contactPerson: customerPayload.contactPerson, deliveryAddress: customerPayload.deliveryAddress, deliveryTime: customerPayload.deliveryTime, sameAddress: customerPayload.sameAddress });
  await window.cloudSync('SAVE_CUSTOMER', { ID: id, TenKH: name, SDT: customerPayload.phone, Data_JSON: jsonPayload });
};

window.deleteCustomer = async function(id) {
  if(!confirm("Bạn chắc chắn muốn xóa khách hàng này?")) return;
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}'); delete custData[id]; window.SafeStore.set('docugen_customers', JSON.stringify(custData));
  window.renderCustomerList(document.getElementById('searchCustomerInput').value); window.showToast("Đã xóa KH", "info");
  await window.cloudSync('DELETE_CUSTOMER', null, id);
};

// QUẢN LÝ ĐƠN HÀNG DB
window.openOrderModal = () => { document.getElementById('orderModal').classList.remove('hidden'); window.renderOrderList(); };
window.closeOrderModal = () => document.getElementById('orderModal').classList.add('hidden');

window.renderOrderList = () => {
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}'); let html = ''; const sortedKeys = Object.keys(orders).sort().reverse();
  sortedKeys.forEach(key => {
      let o = orders[key]; 
      let displayId = o.baseId || key; 
      
      // Đổi màu thông minh dựa trên việc họ đã đi tới bước nào
      let statusClass = 'bg-slate-100 text-slate-700';
      let statusText = 'Bộ Hồ Sơ';
      if (o.orderDates && o.orderDates.delivery) { statusClass = 'bg-emerald-100 text-emerald-700'; statusText = 'Đã Giao Hàng'; }
      else if (o.orderDates && o.orderDates.order) { statusClass = 'bg-indigo-100 text-indigo-700'; statusText = 'Đã Đặt Hàng'; }
      else { statusClass = 'bg-blue-100 text-blue-700'; statusText = 'Đang Báo Giá'; }
      
      let dispDate = o.date || '';
      if (o.orderDates) dispDate = o.orderDates.delivery || o.orderDates.order || o.orderDates.quote || o.date;

      html += `<tr class="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onclick="window.loadOrder('${key}')"><td class="p-3 font-mono font-bold text-xs text-slate-600">${displayId}</td><td class="p-3 text-xs text-slate-500">${dispDate}</td><td class="p-3 font-bold text-slate-800 text-xs truncate max-w-[200px]" title="${o.customerName}">${o.customerName}</td><td class="p-3 font-mono font-bold text-rose-600 text-right">${o.total} đ</td><td class="p-3 text-center"><span class="px-2 py-1 rounded-md text-[10px] font-bold ${statusClass}">${statusText}</span></td><td class="p-3 text-right"><button onclick="event.stopPropagation(); window.deleteOrder('${key}')" class="text-rose-400 hover:text-rose-600 px-2 py-1"><i class="fa-solid fa-trash"></i></button></td></tr>`;
  });
  document.getElementById('orderListBody').innerHTML = html || '<tr><td colspan="6" class="text-center p-8 text-slate-400 font-medium">Chưa có bộ hồ sơ nào được lưu.</td></tr>';
};

window.saveOrderToCloud = async () => {
  const isNew = !window.currentOrderId;
  const now = new Date();
  if (isNew) {
    // Tạo Mã Gốc (Base ID) dùng chung cho cả 3 phiếu
    const num = `${now.getFullYear()}${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
    window.currentOrderId = num; 
    window.orderDates = { quote: null, order: null, delivery: null };
  }
  if (!window.orderDates) window.orderDates = { quote: null, order: null, delivery: null };
  
  // Lưu ngày tháng riêng biệt cho từng tab
  window.orderDates[window.activeDocMode] = document.getElementById('docDateInput').value || now.toLocaleDateString('vi-VN');

  // Backup dữ liệu tab hiện tại vào bộ nhớ tổng trước khi lưu
  window.tabItems[window.activeDocMode] = JSON.parse(JSON.stringify(window.itemsList));
  window.tabNotes[window.activeDocMode] = document.getElementById('docTerms').value;

  let orderData = { 
    baseId: window.currentOrderId,
    mode: window.activeDocMode, 
    orderDates: window.orderDates,
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
    tabItems: window.tabItems, // LƯU CÙNG LÚC 3 BẢNG HÀNG HÓA
    tabNotes: window.tabNotes, // LƯU CÙNG LÚC 3 GHI CHÚ
    total: document.getElementById('displayGrandTotal').innerText.replace(' đ', ''), 
    quoteSumMode: window.quoteSumMode, 
    depositType: window.depositType, 
    depositPercent: document.getElementById('depositPercent').value, 
    depositAmount: document.getElementById('depositFixedAmountInput').value, 
    vat: document.getElementById('vatSelect').value 
  };
  
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}'); 
  orders[window.currentOrderId] = orderData; 
  window.SafeStore.set('docugen_orders', JSON.stringify(orders));
  
  window.initDefaultDocMeta(); 
  window.renderDocPreview(); 
  window.showToast(`Đã lưu Bộ Hồ Sơ: ${window.currentOrderId}`, "success");

  // Đồng bộ Cloud
  let jsonPayload = JSON.stringify(orderData);
  await window.cloudSync('SAVE_ORDER', { MaPhieu: window.currentOrderId, NgayLap: window.orderDates[window.activeDocMode], TenKH: orderData.customerName, LoaiPhieu: orderData.mode, TongTien: orderData.total, Data_JSON: jsonPayload });
};

window.deleteOrder = async (id) => {
  if(!confirm("Bạn có chắc muốn xóa phiếu này?")) return;
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}'); delete orders[id]; window.SafeStore.set('docugen_orders', JSON.stringify(orders));
  window.renderOrderList(); window.showToast("Đã xóa Phiếu", "info");
  if(window.currentOrderId === id) window.resetCustomerForm();
  await window.cloudSync('DELETE_ORDER', null, id);
};
