// sample with stale flag
function renderCheckout() {
  const user = getUser();

  return <OldCheckout />;
}

function getDiscount(user) {
  if (client.isEnabled("summer-sale", user)) {
    return 0.2;
  }
  return 0;
}
