const { exec } = require('child_process');

function runBuildPipeline(projectType) {
    const cmd = projectType === 'minecraft' ? 'gradlew build' : 'roblox-cli deploy';
    
    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error(`[BUILD ERROR]: ${stderr}`);
            // Hata varsa otomatik hatayı loga gönder ve sistemi uyar
        } else {
            console.log(`[BUILD SUCCESS]: ${stdout}`);
        }
    });
}
