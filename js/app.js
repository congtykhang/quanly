// ==========================================
// DOCUGEN PRO - GIAO DIỆN & XỬ LÝ CHÍNH (APP.JS)
// ==========================================

window.activeDocMode = 'quote'; // Mặc định chế độ báo giá
window.itemsList = [];
window.quoteSumMode = 'sum';
window.depositType = 'percent';
window.isCompanyEditing = false;
window.currentOrderId = null;
window.currentOrderDate = '';

// Khởi động toàn bộ ứng dụng khi trang web vừa tải xong
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DocuGen Pro đang khởi động...");
  
  // Gắn sự kiện các nút chuyển chế độ Báo giá / Đặt hàng / Giao hàng
  const btnQuote = document.getElementById('tabModeQuote');
  const btnOrder = document.getElementById('tabModeOrder');
  const btnDelivery = document.getElementById('tabModeDelivery');

  if(btnQuote) btnQuote.addEventListener('click', () => window.switchDocMode('quote'));
  if(btnOrder) btnOrder.addEventListener('click', () => window.switchDocMode('order'));
  if(btnDelivery) btnDelivery.addEventListener('click', () => window.switchDocMode('delivery'));

  // Gọi hàm xác thực đăng nhập từ core.js
  if (window.initAppAuth) {
    await window.initAppAuth();
  } else {
    // Trường hợp phòng hờ core.js chưa load kịp
    const loadingEl = document.getElementById('authLoadingOverlay');
    if(loadingEl) loadingEl.classList.add('hidden');
    const loginBox = document.getElementById('loginBox');
    if(loginBox) loginBox.classList.remove('hidden');
  }
});

// Chuyển đổi chế độ phiếu và cập nhật giao diện
window.switchDocMode = function(mode) {
  window.activeDocMode = mode;
  
  const btnQuote = document.getElementById('tabModeQuote');
  const btnOrder = document.getElementById('tabModeOrder');
  const btnDelivery = document.getElementById('tabModeDelivery');
  
  if(btnQuote) btnQuote.className = mode === 'quote' ? 'px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow' : 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg';
  if(btnOrder) btnOrder.className = mode === 'order' ? 'px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow' : 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg';
  if(btnDelivery) btnDelivery.className = mode === 'delivery' ? 'px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow' : 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg';

  if (window.updateModeUI) window.updateModeUI();
  if (window.renderDocPreview) window.renderDocPreview();
};

window.initDefaultDocMeta = function() {
  const now = new Date();
  const pfx = window.activeDocMode === 'quote' ? 'BG' : (window.activeDocMode === 'order' ? 'ĐH' : 'GH');
  window.currentOrderId = `${pfx}-${now.getFullYear()}${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  window.currentOrderDate = now.toLocaleDateString('vi-VN');
};

window.updateModeUI = function() {
  const titleEl = document.getElementById('docMainTitle');
  if(titleEl) {
    titleEl.innerText = window.activeDocMode === 'quote' ? 'BẢNG BÁO GIÁ' : (window.activeDocMode === 'order' ? 'ĐƠN ĐẶT HÀNG' : 'PHIẾU GIAO HÀNG');
  }
};

window.renderDocPreview = function() {
  const totalEl = document.getElementById('displayGrandTotal');
  if(totalEl && window.itemsList) {
    let sum = window.itemsList.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
    totalEl.innerText = sum.toLocaleString('vi-VN') + ' đ';
  }
};

// Đã fix: Xóa sạch BÀN LÀM VIỆC khi tạo phiếu mới
window.resetCustomerForm = function() {
  window.currentOrderId = null;
  window.itemsList = [];
  
  const textFields = ['currentCustomerId', 'custName', 'custPhone', 'custAddress', 'custTaxId', 'custCompanyPhone', 'custEmail', 'contactPerson', 'deliveryAddress', 'deliveryTime'];
  textFields.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });

  const sameAddr = document.getElementById('sameAddressCheckbox');
  if(sameAddr) sameAddr.checked = false;

  const vat = document.getElementById('vatSelect');
  if(vat) vat.value = '0';
  
  const depPct = document.getElementById('depositPercent');
  if(depPct) depPct.value = '0';
  
  const depAmt = document.getElementById('depositFixedAmountInput');
  if(depAmt) depAmt.value = '0';

  window.initDefaultDocMeta();
  window.renderDocPreview();
};

// Đã fix: Ép ghi đè toàn bộ dữ liệu khi xem lại Đơn hàng cũ
window.loadOrder = function(orderId) {
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}');
  let o = orders[orderId];
  if(!o) return;
  
  window.currentOrderId = orderId;
  window.activeDocMode = o.mode || 'quote';
  window.switchDocMode(window.activeDocMode);
  
  if(document.getElementById('currentCustomerId')) document.getElementById('currentCustomerId').value = o.customerId || '';
  if(document.getElementById('custName')) document.getElementById('custName').value = o.customerName || '';
  if(document.getElementById('custPhone')) document.getElementById('custPhone').value = o.phone || '';
  if(document.getElementById('custAddress')) document.getElementById('custAddress').value = o.address || '';
  if(document.getElementById('custTaxId')) document.getElementById('custTaxId').value = o.taxId || '';
  if(document.getElementById('custCompanyPhone')) document.getElementById('custCompanyPhone').value = o.companyPhone || '';
  if(document.getElementById('custEmail')) document.getElementById('custEmail').value = o.email || '';
  if(document.getElementById('contactPerson')) document.getElementById('contactPerson').value = o.contactPerson || '';
  if(document.getElementById('deliveryAddress')) document.getElementById('deliveryAddress').value = o.deliveryAddress || '';
  if(document.getElementById('deliveryTime')) document.getElementById('deliveryTime').value = o.deliveryTime || '';
  if(document.getElementById('sameAddressCheckbox')) document.getElementById('sameAddressCheckbox').checked = !!o.sameAddress;
  
  if(document.getElementById('vatSelect')) document.getElementById('vatSelect').value = o.vat || 0;
  if(document.getElementById('docTerms')) document.getElementById('docTerms').value = o.terms || '';
  if(document.getElementById('depositPercent')) document.getElementById('depositPercent').value = o.depositPercent || 0;
  if(document.getElementById('depositFixedAmountInput')) document.getElementById('depositFixedAmountInput').value = o.depositAmount || 0;
  
  window.quoteSumMode = o.quoteSumMode || 'sum';
  window.depositType = o.depositType || 'percent';
  
  window.itemsList = o.items || [];
  window.renderDocPreview();
  
  if(window.closeOrderModal) window.closeOrderModal();
  if(window.showToast) window.showToast(`Đã tải Phiếu: ${orderId}`, "success");
};

// Đã fix: Ép ghi đè toàn bộ dữ liệu khi Chọn Khách hàng từ DB
window.selectCustomerById = function(custId) {
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}');
  let c = custData[custId];
  if(!c) return;
  
  if(document.getElementById('currentCustomerId')) document.getElementById('currentCustomerId').value = custId;
  if(document.getElementById('custName')) document.getElementById('custName').value = c.name || '';
  if(document.getElementById('custPhone')) document.getElementById('custPhone').value = c.phone || '';
  if(document.getElementById('custAddress')) document.getElementById('custAddress').value = c.address || '';
  if(document.getElementById('custTaxId')) document.getElementById('custTaxId').value = c.taxId || '';
  if(document.getElementById('custCompanyPhone')) document.getElementById('custCompanyPhone').value = c.companyPhone || '';
  if(document.getElementById('custEmail')) document.getElementById('custEmail').value = c.email || '';
  if(document.getElementById('contactPerson')) document.getElementById('contactPerson').value = c.contactPerson || '';
  if(document.getElementById('deliveryAddress')) document.getElementById('deliveryAddress').value = c.deliveryAddress || '';
  if(document.getElementById('deliveryTime')) document.getElementById('deliveryTime').value = c.deliveryTime || '';
  if(document.getElementById('sameAddressCheckbox')) document.getElementById('sameAddressCheckbox').checked = !!c.sameAddress;
  
  if(window.closeCustomerModal) window.closeCustomerModal();
  if(window.showToast) window.showToast(`Đã chọn Khách hàng: ${c.name}`, "success");
};
