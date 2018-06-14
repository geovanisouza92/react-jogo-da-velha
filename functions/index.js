const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cp = require("child_process");
const path = require("path");
const fs = require("fs");

admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

exports.evaluate = functions.https.onRequest((req, res) => {
  if (req.method !== "POST") {
    res.status(400).end(
      JSON.stringify({
        error: "Apenas requisições POST são permitidas"
      })
    );
    return;
  }

  console.log("request", req.body);

  runTests(req.body.endpoint_url)
    .then(save)
    .then(body => {
      res.end(JSON.stringify(body));
      return console.log("done");
    })
    .catch(err => {
      handleError(err, res);
    });
});

function runTests(endpointUrl) {
  const outputFile = `/tmp/result-${new Date().getTime()}.json`;
  console.log("executing tests against:", endpointUrl);

  return new Promise(resolve => {
    cp.spawnSync(
      "node",
      [
        path.resolve(__dirname, "node_modules/.bin/jest"),
        "--json",
        `--outputFile=${outputFile}`
      ],
      {
        env: Object.assign({}, process.env, {
          ENDPOINT_URL: endpointUrl
        })
      }
    );

    resolve();
  }).then(() => {
    console.log("tests done");

    return JSON.parse(fs.readFileSync(outputFile, "utf-8"));
  });
}

function save(output) {
  if (!output.success) {
    return Promise.resolve(output);
  }

  const doc = db.collection("evaluations").doc();
  console.log("saving to firestore with doc id:", doc.id);

  return doc
    .set(output)
    .then(() => {
      console.log("saved");
      return doc.get();
    })
    .then(snap => {
      const body = {
        id: snap.id,
        createdAt: snap.createTime,
        data: snap.data()
      };

      return body;
    });
}

function handleError(err, res) {
  console.log("EITA");
  console.error(err);

  res.end(
    JSON.stringify({
      error: {
        message: err.message
      }
    })
  );
}
