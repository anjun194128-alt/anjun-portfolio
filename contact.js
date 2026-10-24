const copyPhone = document.querySelector("#copy-phone");
const copyStatus = document.querySelector("#copy-status");

copyPhone.addEventListener("click", async () => {
  try {
    const phone = document.querySelector(".phone-number").getAttribute("href").slice(4);
    await navigator.clipboard.writeText(phone);
    copyStatus.textContent = "电话号码已复制";
  } catch {
    copyStatus.textContent = "复制失败，请重试";
  }
});
