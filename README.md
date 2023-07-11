# atemkontroll - ATEM Control Microservice for Frikanalen

This repository contains the back-end microservice used by the [control frontend](https://github.com/frikanalen/styring).

The microservice provides control and management capabilities for the ATEM video mixer.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Docker](#docker)
- [Contributing](#contributing)
- [License](#license)

## Installation

To install and set up the ATEM control microservice, follow these steps:

1. Clone this repository to your local machine.
2. Install the required dependencies by running the following command:

   ```bash
   yarn install
   ```

## Usage

To start the ATEM control microservice, use the following command:

```bash
yarn start
```

The microservice will be available at `http://localhost:3000`.

## API Endpoints

The following API endpoints are provided by the microservice:

- `GET /program`: Retrieves the current program input of the ATEM video mixer.
- `PUT /program`: Sets the program input of the ATEM video mixer.
- `GET /preview`: Retrieves the current preview input of the ATEM video mixer.
- `PUT /preview`: Sets the preview input of the ATEM video mixer.
- `GET /aux/2`: Retrieves the input source of AUX 2 on the ATEM video mixer.
- `PUT /aux/2`: Sets the input source of AUX 2 on the ATEM video mixer.
- `GET /_healthz`: Checks the health of the microservice.

## Configuration

The configuration of the ATEM control microservice is managed through environment variables. Make sure to set the following environment variables:

- `FK_API`: The URL of the Frikanalen API. This is required in production mode.
- `ATEM_HOST`: The hostname or IP address of the ATEM video mixer. This is required in production mode.

## Docker

A Dockerfile is provided to easily build and run the ATEM control microservice in a containerized environment.

To build the Docker image, run the following command:

```bash
docker build -t atemkontroll .
```

To run the microservice container, use the following command:

```bash
docker run -p 3000:3000 --env FK_API=<FK_API_URL> --env ATEM_HOST=<ATEM_HOST> atemkontroll
```

Replace `<FK_API_URL>` and `<ATEM_HOST>` with the actual values for your environment.

## Contributing

Contributions to the ATEM control microservice are welcome!

If you find any issues or want to add new features, feel free to open an issue or submit a pull request.

Please follow the existing code style and include tests for any new functionality.

## License

This project is licensed under the [MIT License](LICENSE).