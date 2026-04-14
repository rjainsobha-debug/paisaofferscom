import { getFirestore, collection, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "./firebase-config.js";

const db = getFirestore(app);

async function loadOrders() {
  const snapshot = await getDocs(collection(db, "orders"));
  let html = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    html += `
      <div>
        ${data.amazon_order_id} - ₹${data.amount}
        <button onclick="approve('${docSnap.id}')">Approve</button>
      </div>
    `;
  });

  document.getElementById("orders").innerHTML = html;
}

window.approve = async function(id) {
  const cashback = prompt("Enter cashback");

  await updateDoc(doc(db, "orders", id), {
    status: "approved",
    cashback_amount: cashback
  });

  alert("Approved!");
};

loadOrders();
