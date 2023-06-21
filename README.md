# Asana Scripts

## Update Weekly Planning

To run, e.g. `ASANA_WEEK_START=2023-06-19 node update-weekly-plan`

### Environment variables required

`ASANA_PAT` - A personal access token for Asana scripting. You can generate one by going to [https://app.asana.com/0/my-apps](https://app.asana.com/0/my-apps)

`ASANA_WEEK_START` - A date in the format `yyyy-MM-dd`, this can be any date during the week, it will figure out the Monday in that week.

`ASANA_WORKSPACE_ID` - You can find this out by querying your own details (or just ask)
