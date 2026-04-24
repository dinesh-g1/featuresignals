// sample with stale flag
function renderCheckout() {
  const user = getUser();

  if (client.boolVariation("new-checkout", user, false)) {
    return <NewCheckout />;
  }

  return <OldCheckout />;
}

function getDiscount(user) {
  if (client.isEnabled("summer-sale", user)) {
    return 0.2;
  }
  return 0;
}
