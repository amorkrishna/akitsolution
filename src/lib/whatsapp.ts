/**
 * WhatsApp utility functions using wa.me deep links
 */

function cleanPhone(phone: string): string {
  // Remove all non-digit chars except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");
  // If starts with 0, assume Bangladesh (+880)
  if (cleaned.startsWith("0")) {
    cleaned = "880" + cleaned.slice(1);
  }
  // Remove leading +
  cleaned = cleaned.replace(/^\+/, "");
  return cleaned;
}

export function openWhatsApp(phone: string, message: string) {
  const cleaned = cleanPhone(phone);
  if (!cleaned) return;
  const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

export function orderConfirmationMessage(order: {
  customer_name: string;
  item_name: string;
  quantity: number;
  item_price: number;
}): string {
  return `আসসালামু আলাইকুম ${order.customer_name},\n\nআপনার অর্ডার গ্রহণ করা হয়েছে ✅\n\n📦 পণ্য: ${order.item_name}\n📊 পরিমাণ: ${order.quantity}\n💰 মূল্য: ৳${(Number(order.item_price) * order.quantity).toLocaleString()}\n\nশীঘ্রই আপনার সাথে যোগাযোগ করা হবে।\n\nধন্যবাদ\nAK IT Solution`;
}

export function orderStatusMessage(order: {
  customer_name: string;
  item_name: string;
  quantity: number;
  item_price: number;
}, status: string): string {
  const statusMessages: Record<string, string> = {
    pending: `আসসালামু আলাইকুম ${order.customer_name},\n\nআপনার অর্ডার পেন্ডিং আছে। শীঘ্রই প্রসেস করা হবে।\n\n📦 ${order.item_name} x${order.quantity}\n💰 ৳${(Number(order.item_price) * order.quantity).toLocaleString()}\n\nধন্যবাদ\nAK IT Solution`,
    confirmed: `আসসালামু আলাইকুম ${order.customer_name},\n\nআপনার অর্ডার কনফার্ম হয়েছে ✅\n\n📦 ${order.item_name} x${order.quantity}\n💰 ৳${(Number(order.item_price) * order.quantity).toLocaleString()}\n\nডেলিভারির আগে আপনাকে জানানো হবে।\n\nধন্যবাদ\nAK IT Solution`,
    completed: `আসসালামু আলাইকুম ${order.customer_name},\n\nআপনার অর্ডার ডেলিভারি সম্পন্ন হয়েছে 🎉\n\n📦 ${order.item_name} x${order.quantity}\n💰 ৳${(Number(order.item_price) * order.quantity).toLocaleString()}\n\nকোনো সমস্যা হলে যোগাযোগ করুন।\n\nধন্যবাদ\nAK IT Solution`,
    cancelled: `আসসালামু আলাইকুম ${order.customer_name},\n\nদুঃখিত, আপনার অর্ডারটি বাতিল করা হয়েছে।\n\n📦 ${order.item_name}\n\nবিস্তারিত জানতে যোগাযোগ করুন।\n\nধন্যবাদ\nAK IT Solution`,
  };
  return statusMessages[status] || statusMessages.pending;
}

export function clientGreetingMessage(clientName: string): string {
  return `আসসালামু আলাইকুম ${clientName},\n\nAK IT Solution থেকে যোগাযোগ করছি।\n\nকিভাবে সাহায্য করতে পারি?`;
}

export function serviceRequestMessage(request: {
  customer_name: string;
  category: string;
  description: string;
}): string {
  return `আসসালামু আলাইকুম ${request.customer_name},\n\nআপনার সার্ভিস রিকোয়েস্ট পেয়েছি ✅\n\n🔧 ক্যাটাগরি: ${request.category}\n📝 বিবরণ: ${request.description}\n\nশীঘ্রই আমরা আপনার সাথে যোগাযোগ করব।\n\nধন্যবাদ\nAK IT Solution`;
}
