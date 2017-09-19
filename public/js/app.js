const video = document.querySelector('.video');
const canvas = document.querySelector('.canvas');
const context = canvas.getContext('2d');
const snapshot = document.querySelector('.snapshot');
const fxCanvas = fx.canvas();
const brightness = document.querySelector('#brightness');
const contrast = document.querySelector('#contrast');
const receiptContainer = document.querySelector('[route="receipts"]');

let cropper = null;
let cameras = [];
let currentCameraId = null;
let blob = null;

const constraints = {
  video: {
    width: {
      ideal: document.documentElement.clientWidth,
    },
    height: {
      ideal: document.documentElement.clientHeight,
    },
    facingMode: 'environment',
  }
};

const scan = () => {
  step(1);
  document.body.classList.add('mdc-theme--dark');

  navigator.mediaDevices.enumerateDevices().then(deviceInfos => {
    cameras = deviceInfos.filter(d => d.kind == 'videoinput').map(d => d.deviceId);
    if (cameras.length == 1) {
      document.querySelector('.switch-camera').style.display = 'none';
      currentCameraId = cameras[0];
    } else {
      currentCameraId = cameras[1];
    }
    constraints.video.deviceId = currentCameraId;
    startStream(constraints);
  }).catch(console.log);
};

const login = () => {
  stopStream();
  step('-login');
};

const receipts = () => {
  step('-receipts');

  firebase.database().ref('receipts').on('child_added', snap => {
    const receipt = snap.val();
    if (!receiptContainer.contains(receiptContainer.querySelector('[href="' + receipt.path + '"]'))) {
      receiptContainer.insertBefore(createReceiptImage(receipt.thumbnail, receipt.path), receiptContainer.firstChild);
    }
  });
  firebase.database().ref('receipts').on('child_removed', snap => {
    const receipt = snap.val();
    receiptContainer.removeChild(receiptContainer.querySelector('[href="' + receipt.path + '"]').parentNode);
  });
}

const startStream = (constraints) => {
  stopStream();
  navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => video.srcObject = window.stream = stream)
    .catch(console.log);
}

const stopStream = () => {
  if (window.stream) {
    window.stream.getTracks().forEach(track => track.stop());
  }
}

const updateBrightnessContrast = () => {
  fxCanvas.draw(window.texture)
    .brightnessContrast(brightness.value / 100, contrast.value / 100)
    .update();

  document.querySelectorAll('.cropper-container img')
    .forEach(img => img.src = fxCanvas.toDataURL());
}

const step = (stepNum) => {
  document.body.classList = 'step' + stepNum;
}

const start = () => {
  const ui = new firebaseui.auth.AuthUI(firebase.auth());

  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location.hash = '/';
      document.body.classList.remove('mdc-theme--dark');
      const uiConfig = {
        signInSuccessUrl: 'https://jskc.rocks',
        signInOptions: [
          firebase.auth.GoogleAuthProvider.PROVIDER_ID,
          firebase.auth.FacebookAuthProvider.PROVIDER_ID,
          firebase.auth.TwitterAuthProvider.PROVIDER_ID,
          firebase.auth.GithubAuthProvider.PROVIDER_ID,
          firebase.auth.EmailAuthProvider.PROVIDER_ID,
          firebase.auth.PhoneAuthProvider.PROVIDER_ID
        ]
      };
      ui.start('#firebaseui-auth-container', uiConfig);
    } else {
      if (window.location.hash == '#/' || window.location.hash == '') {
        window.location.hash = '/scan';
      }
    }
  });
}

const createReceiptImage = (thumbnail, original) => {
  const html = `
    <a>
      <img>
    </a>
  `;
  const receipt = document.createElement('div');
  receipt.innerHTML = html;
  receipt.classList = 'receipt-wrapper';

  const anchor = receipt.querySelector('a');
  const image = receipt.querySelector('img');

  anchor.href = original;
  image.src = thumbnail;

  return receipt;
}

const logout = () => {
  firebase.auth().signOut();
}

const switchCamera = () => {
  if (cameras.length > 1) {
    if (cameras.indexOf(currentCameraId) == 0) {
      constraints.video.deviceId = cameras[1];
      currentCameraId = cameras[1];
    } else {
      constraints.video.deviceId = cameras[0];
      currentCameraId = cameras[0];
    }
    startStream(constraints);
  }
};

const capture = () => {
  step(2);
  fxCanvas.draw(fxCanvas.texture(video))
    .hueSaturation(-1, -1)
    .unsharpMask(20, 2)
    .update();
  window.texture = fxCanvas.texture(fxCanvas);

  snapshot.src = fxCanvas.toDataURL();
  if (cropper) {
    cropper.destroy();
  }
  cropper = new Cropper(snapshot, {
    crop: function (e) {}
  });
  if (window.stream) {
    window.stream.getTracks().forEach(track => track.stop());
  }
};

const crop = () => {
  step(3);
  snapshot.src = cropper.getCroppedCanvas().toDataURL();
  cropper.getCroppedCanvas().toBlob(b => blob = b);
  cropper.destroy();
};

const done = () => {
  const metadata = {
    contentType: blob.type,
  };
  const storageRef = firebase.storage().ref();
  const pushRef = firebase.database().ref().push();
  const user = firebase.auth().currentUser;
  const faceImagesRef = storageRef.child(`receipts/${user.uid}/${pushRef.key}.${blob.type.split('/')[1]}`);
  faceImagesRef.put(blob, metadata).then(snapshot => {
    console.log('Uploaded a blob or file!');
    console.log(snapshot);
    scan();
  }).catch(console.log);
};
