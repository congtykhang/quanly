// Cập nhật hàm đổi qua lại giữa các chế độ Báo Giá / Đặt Hàng / Giao Hàng để không bị đè dữ liệu sản phẩm
window.switchDocMode = function(mode) {
  window.activeDocMode = mode;
  
  // Đổi màu các nút tab ở đầu trang
  const btnQuote = document.getElementById('tabModeQuote');
  const btnOrder = document.getElementById('tabModeOrder');
  const btnDelivery = document.getElementById('tabModeDelivery');
  
  if(btnQuote) btnQuote.className = mode === 'quote' ? 'px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow' : 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg';
  if(btnOrder) btnOrder.className = mode === 'order' ? 'px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow' : 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg';
  if(btnDelivery) btnDelivery.className = mode === 'delivery' ? 'px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow' : 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg';

  if (window.updateModeUI) window.updateModeUI();
  if (window.renderDocPreview) window.renderDocPreview();
};
