document.addEventListener("DOMContentLoaded", loadAdminOrders);

function loadAdminOrders() {
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  let html = "";

  orders.forEach((o, index) => {
    html += `
      <div style="border:1px solid #000; margin:10px; padding:10px;">
        <p><b>${o.title}</b></p>
        <p>₹${o.amount}</p>
        <p>Status: ${o.status}</p>

        <button onclick="approve(${index})">Approve</button>
      </div>
    `;
  });

  document.getElementById("admin_orders").innerHTML = html;
}

// APPROVE FUNCTION
function approve(index) {
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  let order = orders[index];

  // cashback = 1%
  let cashback = order.amount * 0.01;

  order.status = "approved";
  order.cashback = cashback;

  orders[index] = order;

  localStorage.setItem("orders", JSON.stringify(orders));

  // UPDATE WALLET
  let wallet = parseFloat(localStorage.getItem("wallet_balance")) || 0;
  wallet += cashback;

  localStorage.setItem("wallet_balance", wallet);

  alert("Approved & cashback added!");

  loadAdminOrders();
}
