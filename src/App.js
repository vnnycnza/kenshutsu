import React, { Component } from 'react';
import {
  Container,
  Header,
  Grid,
  Divider,
} from 'semantic-ui-react';
import * as faceapi from 'face-api.js';
import dataset from './dataset';

class App extends Component {
  constructor(props) {
    super(props);
 
    this.state = {
      maxItems: 5
    };

    this.loadModels = this.loadModels.bind(this);
    this.loadDataSet = this.loadDataSet.bind(this);
    this.loadFaceDetectionAndRecognitionModels = this.loadFaceDetectionAndRecognitionModels.bind(this);
    this.detectFace = this.detectFace.bind(this);
  }

  async loadModels() {
    console.log('Loading Models...');
    return Promise.all([
      faceapi.loadFaceLandmarkModel('./models'),
      faceapi.loadSsdMobilenetv1Model('./models'),
      faceapi.loadFaceDetectionModel('./models'),
      faceapi.loadFaceRecognitionModel('./models'),
    ]);
  }
  
  async loadDataSet() {
    console.log('Loading Datasets...');
    return Promise.all(
      dataset.map(async data => {
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
  }

  async loadFaceDetectionAndRecognitionModels() {
    const video = document.querySelector('video');
    const canvas = document.querySelector('canvas');
    const w = video.offsetWidth;
    const h = video.offsetHeight;

    console.log('w', w, 'h', h);

    await this.loadModels();
    console.log('Models Loaded!');

    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: w, height: h }});
    video.srcObject = stream;
    canvas.width = w;
    canvas.height = h;
    console.log('Video Loaded!');

    await (async () => new Promise((resolve, reject) => video.onplaying = resolve))();
    console.log('Video Playing!');

    const data = await this.loadDataSet();
    console.log('Dataset loaded!');

    const faceMatcher = new faceapi.FaceMatcher(data, 0.6);
    setInterval(async () => {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      await this.detectFace(video, canvas, faceMatcher);
    }, 2000);
  }

  async detectFace(video, canvas, matcher) {
    const displaySize = { width: canvas.width, height: canvas.height };
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

  componentDidMount() {
    this.loadFaceDetectionAndRecognitionModels()
      .then(() => console.log('All loaded!'))
      .catch(err => console.log('Error', err));
  }

  render () {
    return (
      <div className="App">
      <Container>
        <Grid textAlign='center' style={{ marginTop: '3em' }} verticalAlign='middle'>
          <Grid.Column style={{ maxWidth: 720 }}>
            <Header as='h2' color='teal' textAlign='left'>
              do i know you?
              <Header.Subheader>
              Just trying out if I can recognize who you are <span role='img' aria-label="wink">😜</span>
              </Header.Subheader>
            </Header>
            <Divider></Divider>
            <Container fluid>
              <video id="video"
                style={{
                  width: '100%',
                  position: 'absolute',
                  left: 0,
                }}
                autoPlay muted></video>
              <canvas style={{
                  width: '100%',
                  position: 'absolute',
                  left: 0,
                }}
              ></canvas>
            </Container>
          </Grid.Column>
        </Grid>
      </Container>
      </div>
    );
  }
}

export default App;



