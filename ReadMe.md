# ai-tools - (Interactive) CLI, REST, and GUI tools for AI

This repository provides a comprehensive suite of tools for AI development, allowing for accelerated development of AI applications and unified tracking of token usage and billing information.
## Supported Tools

- OpenAI GPT-3 Text Models ('text-davinci-003', 'ada', 'currie')
- chatGPT
- DeepVA (All Visual Mining Modules)

## Installation

Install the repository via npm if you want to incorporate it into existing tool chains, or clone the repository if you plan to use it as a standalone application.

```
npm install -g ai-tools
```

```
git clone https://github.com/AxelRothe/ai-tools.git ai-tools
```

## Build

You will need to build the app before you can use it. This will create a `build` folder with the compiled app.

```shell
#build 
npm run build
#build and run with server
npm run server
#just start cli, will display help
npm run start
```

## Usage

### CLI

```shell
#start cli
node build
#start interactive cli
node build chat
#prompt cli and get response as JSON
node build prompt "my prompt" --temperature 0.5 --max_tokens 100 --model "text-davinci-003" --json
#start cli with server
node build server
#start cli with server and port
node build server --port 3000
```
### REST

`prompt` and `chat` are all available as REST endpoints. The server is available at `http://localhost:8000` by default, and can be changed with the `--port` flag or by setting it in the .env file.

#### Authorization

The app requires an OpenAI API key and session to be set in the .env file. The .env file is not included in the repo, and must be created by the user. The .env file should be placed in the root directory of the project. The .env file should contain the following:

```
OPENAI_API_KEY="<YOUR_API_KEY>"
OPENAI_API_SESSION_TOKEN="<SESSION_TOKEN>"
SERVER_PORT="8000"
SERVER_PATH_CACHE="/path/to/cache"
SERVER_TOKENS="/path/to/cache/tokens.json"
```

#### Endpoints

**Authorization:**

```
GET /api/auth
headers {
    Authorization: "Bearer <YOUR_TOKEN>",
}
```

You will need to add a Authorization Token via the Bearer in order to connect to the REST API, use `/api/auth` with GET to check if your token is valid. Tokens are set in an array in your SERVER_TOKENS file.

**Example:**
```
[
    "1234",
    "5678",
    "9012"
]
```

Run a prompt with the following endpoint:

```
POST /api/prompt
{
    "prompt": "my prompt",
    "temperature": 0.5,
    "max_tokens": 100,
    "model": "text-davinci-003"
}
```

Create a new chat. Returns a JSON object with the prompt ID and the prompt text.

```
POST /api/chat/new -> returns id
{
    "prompt": "my prompt",
    "temperature": 0.5,
    "max_tokens": 100,
    "model": "text-davinci-003"
}
```

Continue on the thread with the id returned from the previous request.

```
POST /api/chat/:id
{
    "prompt": "my message",
    "temperature": 0.5,
    "max_tokens": 100,
    "model": "text-davinci-003"
}
```

Get the chat and its history

```
GET /api/chat/:id
```

Removes the entire chat from the server

```
DELETE /api/chat/:id
```

Removes the last record in the chat
```
DELETE /api/chat/:id/last
```

## Contributing

Instructions for how others can contribute to your project, such as:

1. Fork the repository
2. Create a new branch (`git checkout -b new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin new-feature`)
5. Create a new Pull Request

## License

GPL-3.0 License

Copyright (c) 2023 Axel Rothe

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.

