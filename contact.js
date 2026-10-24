const copyPhone = document.querySelector("#copy-phone");
const copyStatus = document.querySelector("#copy-status");

copyPhone.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("18600000000");
    copyStatus.textContent = "电话号码已复制";
  } catch {
    copyStatus.textContent = "复制失败，请重试";
  }
});
