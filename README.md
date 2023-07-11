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

All endpoints require a valid session cookie, checked against toches.
Currently only 1 M/E bus is supported, and only aux 2 is supported.

For source IDs, consult the excellent [SKAARHOJ documentation](https://www.skaarhoj.com/discover/blackmagic-atem-switcher-protocol#:~:text=Commands-,VIDEOSRC,-Array).

- `GET /program`: Retrieves the current program input of the video mixer.
- `GET /preview`: Retrieves the current preview input of the video mixer.
- `GET /aux/2`: Retrieves the input source of AUX 2 on the ATEM video mixer.

GET response body schema:
   ```javascript
   {
     inputId: number // Input video source ID
   }
   ```

- `PUT /program`: Sets the program input of the ATEM video mixer.
- `PUT /preview`: Sets the preview input of the ATEM video mixer.
- `PUT /aux/2`: Sets the input source of AUX 2 on the ATEM video mixer.

PUT request body schema:
  ```javascript
  {
    inputId: number // Input video source ID
  }
  ```

Responses:
- `200 OK`: The program input was successfully set.
- `400 Bad Request`: The request body is missing or contains invalid input.
- `403 Forbidden`: The session is of a non-staff user.
- `422 Unprocessable Entity`: The request body is invalid JSON.
- `500 Internal Server Error`: The ATEM video mixer returned an error, or authentication against the backend failed.


- `GET /_healthz`: Checks the health of the microservice.

   - Response:
      - `200 OK`: The microservice is healthy.

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