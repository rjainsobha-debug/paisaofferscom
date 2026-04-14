// LOAD WALLET + ORDERS
document.addEventListener("DOMContentLoaded", () => {
  loadWallet();
  loadOrders();
});

function loadWallet() {
  const wallet = localStorage.getItem("wallet_balance") || 0;
  document.getElementById("wallet_balance").innerText = "₹" + wallet;
}

function loadOrders() {
  const orders = JSON.parse(localStorage.getItem("orders")) || [];

  let html = "";

  orders.forEach(o => {
    html += `
      <div style="border:1px solid #ccc; margin:10px; padding:10px;">
        <p><b>${o.title}</b></p>
        <p>₹${o.amount}</p>
        <p>Status: ${o.status}</p>
      </div>
    `;
  });

  document.getElementById("orders_list").innerHTML = html;
}
