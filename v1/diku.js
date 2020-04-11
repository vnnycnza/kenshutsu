const video = document.querySelector('video');
const canvas = document.querySelector('canvas');
init();

async function init() {
  try {
    await loadModels();
    console.log('Models Loaded!');

    const stream = await navigator.mediaDevices.getUserMedia({video: {width: 750, height: 560}});
    video.srcObject = stream;
    canvas.width = video.width;
    canvas.height = video.height;
    console.log('Video Loaded!');

    await (async () => new Promise((resolve, reject) => video.onplaying = resolve))();
    console.log('Video Playing!');

    const data = await loadDataSet();
    console.log('Dataset loaded!');

    const faceMatcher = new faceapi.FaceMatcher(data, 0.6);
    setInterval(async () => {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      await detectFace(canvas, faceMatcher);
    }, 2000);

  } catch (err) {
    console.log(err);
  }
}

async function detectFace(canvas, matcher) {
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors()
  const resizedDetections = faceapi.resizeResults(detections, displaySize);

  const results = resizedDetections.map(d => matcher.findBestMatch(d.descriptor));
  results.forEach((result, i) => {
    const name = result.label === 'unknown' ? 'i don\'t know you' : `hey, ${result.label}!`;
    const box = resizedDetections[i].detection.box;
    const drawBox = new faceapi.draw.DrawBox(box, { label: name });
    drawBox.draw(canvas);
  });
}

function loadModels() {
  console.log('Loading Models...');
  return Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
  ]);
};

async function loadDataSet() {
  console.log('Loading Datasets...');
  const response = await fetch('dataset.json');
  const parsed = await response.json();
  
  return Promise.all(
    parsed.map(async data => {
      const { name, photos } = data;
      const descriptions = [];

      photos.forEach(async photo => {
        const img = await faceapi.fetchImage(photo);
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
        descriptions.push(detections.descriptor);
      });

      return new faceapi.LabeledFaceDescriptors(name, descriptions)
    })
  );
};