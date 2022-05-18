import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { fromIni } from "@aws-sdk/credential-providers";

const AWS_REGION = 'us-east-1';
const AWS_SNS_TOPIC_MINECRAFT_EVENTS = 'arn:aws:sns:us-east-1:023800829229:MinecraftEvents';
const DEFAULT_POLL_TIMEOUT = 1000;

const sleep = (duration) => new Promise(resolve => setTimeout(resolve, duration));
const getMapDifferenceKeys = (a, b) => new Set([...a.keys()].filter(x => !b.has(x))); // a - b

const lambdaClient = new LambdaClient({ credentials: fromIni(), region: AWS_REGION });
const snsClient = new SNSClient({ credentials: fromIni(), region: AWS_REGION });

let currentOnlinePlayersMap = null;

async function getOnlinePlayers() {
  const command = new InvokeCommand({
    FunctionName: 'executeMinecraftCommands',
    Payload: JSON.stringify({
      params: {
        commands: ['list uuids'],
      },
    }),
  });
  
  const response = await lambdaClient.send(command);
  return JSON.parse(new TextDecoder().decode(response.Payload)).results[0];
}

function publishMinecraftEvent(event) {
  const command = new PublishCommand({
    Message: JSON.stringify(event),
    TopicArn: AWS_SNS_TOPIC_MINECRAFT_EVENTS,
  });
  return snsClient.send(command);
}

async function monitorOnlinePlayers() {
  const { players } = await getOnlinePlayers();
  const newOnlinePlayersMap = new Map(players.map(player => [player.uuid, player]));

  // Don't publish events on monitor startup
  if (currentOnlinePlayersMap === null) {
    currentOnlinePlayersMap = newOnlinePlayersMap;
    return;
  }

  const loggedInUuids = Array.from(getMapDifferenceKeys(newOnlinePlayersMap, currentOnlinePlayersMap));
  const loggedOutUuids = Array.from(getMapDifferenceKeys(currentOnlinePlayersMap, newOnlinePlayersMap));
  const loggedInPlayers = loggedInUuids.map(uuid => newOnlinePlayersMap.get(uuid));
  const loggedOutPlayers = loggedOutUuids.map(uuid => currentOnlinePlayersMap.get(uuid));
  
  const promises = [];
  for (const player of loggedInPlayers) promises.push(publishMinecraftEvent({ type: 'PLAYER_LOG_IN', payload: { player } }));
  for (const player of loggedOutPlayers) promises.push(publishMinecraftEvent({ type: 'PLAYER_LOG_OUT', payload: { player } }));

  const results = await Promise.allSettled(promises);
  results.filter(({ status }) => status === 'rejected').map(({ reason }) => console.error(reason));

  currentOnlinePlayersMap = newOnlinePlayersMap;
}

while (true) {
  await monitorOnlinePlayers();
  await sleep(DEFAULT_POLL_TIMEOUT);
}
