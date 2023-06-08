const asana = require("asana");
require("dotenv").config();
const dateFns = require("date-fns");

if (!process.env.ASANA_PAT) {
  console.error("Must provide the ASANA_PAT.");
  process.exit(1);
}

if (!process.env.ASANA_WEEK_START) {
  console.error("Must provide the ASANA_WEEK_START (yyyy-MM-dd).");
  process.exit(1);
}

let weekStart = new Date(process.env.ASANA_WEEK_START);
if (isNaN(weekStart.getTime())) {
  console.error("Must provide a valid ASANA_WEEK_START (yyyy-MM-dd).");
  process.exit(1);
}

if (!dateFns.isMonday(weekStart)) {
  weekStart = dateFns.startOfDay(dateFns.previousMonday(weekStart));
}

const weekEnd = dateFns.addDays(weekStart, 7);

// Construct an Asana client
var client = asana.Client.create().useAccessToken(process.env.ASANA_PAT);

/**
 * Await-able 'sleep'
 * @param time amount of ms to wait
 */
function wait(time) {
  return new Promise((res) => {
    setTimeout(() => {
      res(true);
    }, time);
  });
}

/**
 * A script to automate (ish) the daily update comments
 *
 * 1. Get the "This week's plan submission" entry for the given week
 * 2. Get the tasks for this week
 * 3. Serialise the task titles to comments on the entry found in #1
 *
 * (Existing comments will be overwritten)
 *
 */

(async function main() {
  try {
    const me = await client.users.me();

    const weekPlans = await client.tasks.searchTasksForWorkspace(
      process.env.NRWL_WORKSPACE_ID,
      {
        resource_subtype: "default_task",
        text: "This week's plan submission",
        "created_by.any": me.gid,
        "created_on.after": dateFns.format(weekStart, "yyyy-MM-dd"),
        "created_on.before": dateFns.format(weekEnd, "yyyy-MM-dd"),
        opt_fields: "created_at,name",
      }
    );

    console.log(weekPlans.data);

    if (weekPlans.data.length !== 1) {
      console.error("Found more week plans than expected.");
      process.exit(1);
    }

    // for (const plan of weekPlans.data) {
    //   const planDate = new Date(plan.created_at);
    //   const startOfWeek = dateFns.isMonday(planDate)
    //     ? planDate
    //     : dateFns.previousMonday(planDate);

    // Get all current stories on the plan
    const stories = await client.stories.findByTask(plan.gid);
    const comments = stories.data.filter((s) => s.type === "comment");

    for (let days = 0; days < 5; days++) {
      const dayOfWeek = dateFns.addDays(startOfWeek, days);
      const dailyTasks = await client.tasks.searchTasksForWorkspace(
        process.env.NRWL_WORKSPACE_ID,
        {
          resource_subtype: "default_task",
          "assignee.any": me.gid,
          due_on: dateFns.format(dayOfWeek, "yyyy-MM-dd"),
          opt_fields: "created_at,name",
        }
      );

      const dayOfWeekStr = dateFns.format(dayOfWeek, "EEEE");

      const message = [`🗓️ ${dayOfWeekStr}\n`];

      if (dailyTasks.data.length) {
        message.push(...dailyTasks.data.map((d) => `🔍 ${d.name}`));
      } else {
        message.push("🏝️ No tasks defined.");
      }

      console.log(
        `Adding comments for ${dayOfWeekStr} on ${plan.gid}, title is ${plan.name}`
      );

      const existingComment = comments.find((c) =>
        c.text.startsWith(message[0])
      );
      if (existingComment) {
        console.log("UPDATING EXISTING STORY");
        client.stories.updateStory(existingComment.gid, {
          text: message.join("\n"),
        });
      } else {
        console.log("CREATING NEW STORY");
        client.stories.createOnTask(plan.gid, { text: message.join("\n") });
      }

      // wait briefly so we don't get the comments in a weird order.
      await wait(2000);
      // }
    }
  } catch (e) {
    if (e.value) {
      console.log(JSON.stringify(e.value.errors));
    }
  }
})();
