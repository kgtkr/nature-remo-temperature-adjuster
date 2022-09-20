import { DefaultApi, Configuration } from "./generated";
import axios from "axios";

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable "${key}" is not defined.`);
    }
    return defaultValue;
  }
  return value;
}

function unwrap<T>(val: T | undefined): T {
  if (val === undefined) {
    throw new Error("value is undefined.");
  }
  return val;
}

function discomfortIndex(temperature: number, humidity: number): number {
  return (
    0.81 * temperature + 0.01 * humidity * (0.99 * temperature - 14.3) + 46.3
  );
}

const natureRemoToken = getEnv("NATURE_REMO_TOKEN");
const applianceNickname = process.env.APPLIANCE_NICKNAME;
const diMin = Number(getEnv("DI_MIN", "60"));
const diMax = Number(getEnv("DI_MAX", "75"));
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;
const interval = Number(getEnv("INTERVAL", "15"));
const client = new DefaultApi(
  new Configuration({
    accessToken: natureRemoToken,
  })
);

async function run() {
  const aircons = (await client._1appliancesGet()).data.filter(
    (x) => x.type === "AC"
  );
  if (aircons.length === 0) {
    throw new Error("No aircon found.");
  }
  const aircon =
    applianceNickname === undefined
      ? aircons[0]
      : aircons.find((x) => unwrap(x.nickname) === applianceNickname);
  if (aircon === undefined) {
    throw new Error(
      `AirCon "${applianceNickname}" not found. Available: ${aircons
        .map((a) => a.nickname)
        .join(", ")}`
    );
  }

  if (unwrap(aircon.settings?.button) === "power-off") {
    console.log("AirCon is off.");
    return;
  }

  const airconMode = unwrap(aircon.settings?.mode);

  if (airconMode !== "auto" && airconMode !== "cool" && airconMode !== "warm") {
    console.log(`AirCon mode is "${airconMode}".`);
    return;
  }

  const airconTempStr = aircon.settings?.temp;
  if (airconTempStr === undefined) {
    throw new Error("AirCon temperature is unknown.");
  }
  const airconTemp = Number(airconTempStr);
  console.log(`AirCon temperature: ${airconTemp}`);

  const airconId = unwrap(aircon.id);
  const deviceCore = aircon.device;
  if (deviceCore === undefined) {
    throw new Error("Remo device is unknown.");
  }
  const deviceId = unwrap(deviceCore.id);
  console.log(`AirCon "${airconId}" and Device "${deviceId}" found.`);

  const device = (await client._1devicesGet()).data.find(
    (x) => x.id === deviceId
  );

  if (device === undefined) {
    throw new Error(`Device "${deviceId}" not found.`);
  }

  const temperature = device.newest_events?.te?.val;
  if (temperature === undefined) {
    throw new Error("Temperature is unknown.");
  }
  const humidity = device.newest_events?.hu?.val;
  if (humidity === undefined) {
    throw new Error("Humidity is unknown.");
  }

  const di = discomfortIndex(temperature, humidity);

  console.log(
    `Temperature: ${temperature}, Humidity: ${humidity}, DiscomfortIndex: ${di}`
  );

  const airconNewTemp =
    di < diMin ? airconTemp + 1 : di > diMax ? airconTemp - 1 : airconTemp;

  if (airconTemp === airconNewTemp) {
    console.log("No need to change temperature.");
    return;
  }

  console.log(`Changing temperature to ${airconNewTemp}...`);
  await client._1appliancesApplianceAirconSettingsPost(
    airconId,
    String(airconNewTemp)
  );

  if (discordWebhookUrl === undefined) {
    return;
  }

  await axios.post(discordWebhookUrl, {
    content: `AirCon temperature changed ${airconTemp} -> ${airconNewTemp}`,
    embeds: [
      {
        title: "AirCon temperature changed",
        fields: [
          {
            name: "Temperature",
            value: String(temperature),
            inline: true,
          },
          {
            name: "Humidity",
            value: String(humidity),
            inline: true,
          },
          {
            name: "DiscomfortIndex",
            value: String(di),
            inline: true,
          },
        ],
      },
    ],
  });
}

async function main() {
  while (true) {
    try {
      await run();
    } catch (e) {
      console.error(e);
    }
    await new Promise((resolve) => setTimeout(resolve, interval * 1000 * 60));
  }
}

main();
