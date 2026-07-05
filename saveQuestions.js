import fs from "fs";

export function saveQuestions(path,data){

    fs.writeFileSync(
        path,
        JSON.stringify(data,null,2),
        "utf8"
    );

}