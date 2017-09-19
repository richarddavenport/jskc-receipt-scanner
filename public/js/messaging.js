const messaging = firebase.messaging();

const MDCSnackbar = mdc.snackbar.MDCSnackbar;
const snackbar = new MDCSnackbar(document.querySelector('.mdc-snackbar'));

const snack = {
  message: 'New Receipt!',
  actionText: '💲💲💲'
};

messaging.onTokenRefresh(() => {
  getToken();
});

messaging.onMessage(payload => {
  console.log(payload);
  snackbar.show(snack);
});

const sendTokenToServer = (currentToken) => {
  const uid = firebase.auth().currentUser.uid;
  firebase.database().ref(`tokens/${uid}`).set({ [currentToken]: true })
    .catch(console.log);
}

const requestPermission = () => {
  messaging.requestPermission()
    .then(getToken)
    .catch(console.log);
}

const getToken = () => {
  return messaging.getToken()
    .then(refreshedToken => sendTokenToServer(refreshedToken))
}
