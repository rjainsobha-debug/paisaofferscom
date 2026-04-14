import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { app } from "./firebase-config.js";

const db = getFirestore(app);

window.submitOrder = async function() {
  const orderId = document.getElementById("order_id").value;
  const amount = document.getElementById("amount").value;

  await addDoc(collection(db, "orders"), {
    amazon_order_id: orderId,
    amount: amount,
    status: "pending",
    cashback_amount: 0,
    created_at: new Date()
  });

  alert("Order submitted!");
};
