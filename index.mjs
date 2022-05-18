import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { fromIni } from "@aws-sdk/credential-providers";

const AWS_REGION = 'us-east-1';
const DEFAULT_POLL_TIMEOUT = 1000;

const sleep = (duration) => new Promise(resolve => setTimeout(resolve, duration));
const getSetDifference = (a, b) => new Set([...a].filter(x => !b.has(x))); // a - b
const lambdaClient = new LambdaClient({
  credentials: fromIni(),
  region: AWS_REGION,
});

let currentOnlinePlayersSet = new Set();

async function getOnlinePlayers() {
  const command = new InvokeCommand({
    FunctionName: 'executeMinecraftCommands',
    Payload: JSON.stringify({
      params: {
        commands: ['list'],
      },
    }),
  });
  
  const response = await lambdaClient.send(command);
  return JSON.parse(new TextDecoder().decode(response.Payload)).results[0];
}

async function monitorOnlinePlayers() {
  const { players } = await getOnlinePlayers();
  const newOnlinePlayersSet = new Set(players);
  const loggedIn = Array.from(getSetDifference(newOnlinePlayersSet, currentOnlinePlayersSet));
  const loggedOut = Array.from(getSetDifference(currentOnlinePlayersSet, newOnlinePlayersSet));

  if (loggedIn.length) console.log('logged in:', loggedIn.join(', '));
  if (loggedOut.length) console.log('logged out:', loggedOut.join(', '));

  currentOnlinePlayersSet = newOnlinePlayersSet;
}

while (true) {
  await monitorOnlinePlayers();
  await sleep(DEFAULT_POLL_TIMEOUT);
}
