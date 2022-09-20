# nature-remo-temperature-adjuster
Auto adjust temperature based on discomfort index with Nature Remo.

## Docker image
```
$ docker pull ghcr.io/kgtkr/nature-remo-temperature-adjuster
```

## Env vars
| Name | Description | Default |
| ---- | ----------- | ------- |
| `NATURE_REMO_TOKEN` | Nature Remo API token | |
| `APPLIANCE_NICKNAME` | Appliance nickname | `undefined` (use the first air con) |
| `DI_MIN` | Minimum discomfort index | `60` |
| `DI_MAX` | Maximum discomfort index | `75` |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | `undefined` (no notification) |
| `INTERVAL` | Interval (minutes) | `15` |
