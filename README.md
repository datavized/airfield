# Airfield

Airfield is a free web tool that lets you edit audio. It is 100% web browser based. You can import audio into Airfield from your device. When you are ready to export you have the option to create a file in Mono or Stereo, or you can Spatialize your audio for use in immersive projects for Virtual Reality (VR), Augmented Reality (AR), Mixed Reality (MR).

Airfield was built by [Datavized Technologies](https://datavized.com) and made possible by a Journalism 360 Grant Award from the Online News Association. 

Airfield can be used with an [Ambisonic Audio Component](https://github.com/datavized/aframe-ambisonic-component) for A-Frame for WebXR.

## What’s it for?

Airfield is designed to let you record and edit in the field, to use when you can’t bring bulky or expensive equipment.

## 100% Web

Airfield has been coded from the ground up for powerful performance on web browsers, for mobile and desktop.

## 2D & 3D Sound

Airfield lets you Import audio files from your device to edit, then Export as Mono/Stereo or Spatialize for VR/AR.

**Please note the app currently does not allow for export directly to iOS devices. Alternatively iOS mobile users can export to Google Drive.**

## Developing

You can run your own build of Airfield. You can make changes to customize for your own purposes, and contributions are welcome if you make any improvements or bug fixes.

### Requirements
- [git](https://git-scm.com/book/en/Getting-Started-Installing-Git)
- [node.js/npm](https://www.npmjs.com/get-npm)

### Installation

Clone the Airfield git repository from the command line:
```sh
git clone https://github.com/datavized/airfield.git
```

Navigate to the Airfield repository directory
```sh
cd airfield
```

Install dependencies
```sh
npm install
```
### Build

To run in development mode, which will run a local web server on port 9000 and automatically rebuild when any source code files are changed.
```sh
npm run start
```

To compile a production build
```sh
npm run build
```

## Built With
- [React](https://reactjs.org/)
- [Material UI](https://material-ui.com/)

## Core Team
Airfield is maintained by [Datavized Technologies](https://datavized.com).

If you want to know more about Airfield, how it works and future developments, please visit the official website. For any specific request or comment we suggest you to use Github. You can also write to us at contact@datavized.com.

## Contributing

We welcome and appreciate contributions, in the form of code pull requests, bug reports, feature requests or additions to our gallery. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our [Code of Conduct](CODE_OF_CONDUCT.md) and submission process. By participating, you are expected to uphold this code. Please report unacceptable behavior to support@datavized.com.

## License

This software is licensed under the [MPL 2.0](LICENSE)
