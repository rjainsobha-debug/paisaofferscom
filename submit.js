// ================= AUTO FILL FROM LAST CLICK
document.addEventListener("DOMContentLoaded", () => {
  const data = JSON.parse(localStorage.getItem("last_clicked"));

  if (data) {
    if (document.getElementById("product_title")) {
      document.getElementById("product_title").value = data.title || "";
    }

    if (document.getElementById("product_price")) {
      document.getElementById("product_price").value = data.price || "";
    }

    if (document.getElementById("amount")) {
      document.getElementById("amount").value = data.price || "";
    }
  }
});


// ================= SUBMIT ORDER (KEEP SIMPLE FOR NOW)
async function submitOrder() {
  const orderId = document.getElementById("order_id").value;
  const amount = document.getElementById("amount").value;
  const title = document.getElementById("product_title").value;

  if (!orderId || !amount) {
    alert("Please fill all details");
    return;
  }

  // TEMP: store locally (later Firebase)
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  orders.push({
    order_id: orderId,
    title: title,
    amount: amount,
    status: "pending",
    time: new Date()
  });

  localStorage.setItem("orders", JSON.stringify(orders));

  alert("Order submitted successfully!");

  // optional reset
  document.getElementById("order_id").value = "";
}
