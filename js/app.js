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
    document.getElementById('loginBox').classList.remove('hidden');
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
  // Cập nhật hiển thị giao diện xem trước chứng từ
  const totalEl = document.getElementById('displayGrandTotal');
  if(totalEl && window.itemsList) {
    let sum = window.itemsList.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
    totalEl.innerText = sum.toLocaleString('vi-VN') + ' đ';
  }
};

window.resetCustomerForm = function() {
  window.currentOrderId = null;
  window.itemsList = [];
  const custName = document.getElementById('custName');
  if(custName) custName.value = '';
  window.initDefaultDocMeta();
  window.renderDocPreview();
};

window.loadOrder = function(orderId) {
  let orders = JSON.parse(window.SafeStore.get('docugen_orders') || '{}');
  let o = orders[orderId];
  if(!o) return;
  
  window.currentOrderId = orderId;
  window.activeDocMode = o.mode || 'quote';
  window.switchDocMode(window.activeDocMode);
  
  if(document.getElementById('custName')) document.getElementById('custName').value = o.customerName || '';
  if(document.getElementById('custPhone')) document.getElementById('custPhone').value = o.phone || '';
  if(document.getElementById('custAddress')) document.getElementById('custAddress').value = o.address || '';
  
  window.itemsList = o.items || [];
  window.renderDocPreview();
  if(window.closeOrderModal) window.closeOrderModal();
  window.showToast(`Đã tải Phiếu: ${orderId}`, "success");
};

window.selectCustomerById = function(custId) {
  let custData = JSON.parse(window.SafeStore.get('docugen_customers') || '{}');
  let c = custData[custId];
  if(!c) return;
  
  if(document.getElementById('currentCustomerId')) document.getElementById('currentCustomerId').value = custId;
  if(document.getElementById('custName')) document.getElementById('custName').value = c.name || '';
  if(document.getElementById('custPhone')) document.getElementById('custPhone').value = c.phone || '';
  if(document.getElementById('custAddress')) document.getElementById('custAddress').value = c.address || '';
  
  if(window.closeCustomerModal) window.closeCustomerModal();
  window.showToast(`Đã chọn Khách hàng: ${c.name}`, "success");
};
