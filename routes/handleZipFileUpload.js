const utils = require("../lib/utils");
const os = require("os");
const fs = require("fs");
const unzipper = require("unzipper");
const path = require("path");
const { challenges } = require("./fileUpload");

function handleZipFileUpload({ file }, res, next) {
  if (utils.endsWith(file.originalname.toLowerCase(), ".zip")) {
    if (file.buffer && !utils.disableOnContainerEnv()) {
      const buffer = file.buffer;
      const filename = file.originalname.toLowerCase();
      const tempFile = path.join(os.tmpdir(), filename);
      fs.open(tempFile, "w", function (err, fd) {
        if (err) {
          next(err);
        }
        fs.write(fd, buffer, 0, buffer.length, null, function (err) {
          if (err) {
            next(err);
          }
          fs.close(fd, function () {
            fs.createReadStream(tempFile)
              .pipe(unzipper.Parse())
              .on("entry", function (entry) {
                const fileName = entry.path;
                const absolutePath = path.resolve(
                  "uploads/complaints/" + fileName
                );
                utils.solveIf(challenges.fileWriteChallenge, () => {
                  return absolutePath === path.resolve("ftp/legal.md");
                });
                if (absolutePath.includes(path.resolve("."))) {
                  entry.pipe(
                    fs
                      .createWriteStream("uploads/complaints/" + fileName)
                      .on("error", function (err) {
                        next(err);
                      })
                  );
                } else {
                  entry.autodrain();
                }
              })
              .on("error", function (err) {
                next(err);
              });
          });
        });
      });
    }
    res.status(204).end();
  } else {
    next();
  }
}
