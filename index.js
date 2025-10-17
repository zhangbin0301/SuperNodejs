const FILE_PATH = process.env.FILE_PATH || './.npm';                       // 运行文件夹，节点文件存放目录
const intervalInseconds = process.env.TIME || 100;                         // 间隔时间（100秒），这个也是上传间隔时间。
const CFIP = process.env.CFIP || 'ip.sb';                                  // 优选域名或优选ip
const CFPORT = process.env.CFPORT || '443';                                // 节点端口 443 2053 2083 2087 2096 8443
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));     // 延时参数,ms是毫秒 1000ms=1秒
const OPENSERVER = (process.env.OPENSERVER || 'true') === 'true';          // true OR false  值在前一个引号填写。true为使用argo
const KEEPALIVE = (process.env.KEEPALIVE || 'false') === 'true';           // true OR false  值在前一个引号填写。KEEPALIVE为true时保活进程，无限循环检测上传。为false时不保活进程，运行后删除文件(列表中可选择删除或不删除),一次上传
const MY_DOMAIN = process.env.MY_DOMAIN || '';                             // 直连cdn域名，玩具需rule到端口
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';                         // 固定隧道域名，留空即启用临时隧道
const ARGO_AUTH = process.env.ARGO_AUTH || '';                             // 固定隧道json或token，留空即启用临时隧道

// vless或xhttp二选一
const VLPATH = process.env.VLPATH || 'startvl';                            // startvl
const XHPPATH = process.env.XHPPATH || '';                                 // startxhp

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;
const V_PORT = process.env.V_PORT || 8080;                                 // argo端口，玩具直连需使用开放端口，即SERVER_PORT

const UUID = process.env.UUID || '7160b696-dd5e-42e3-a024-145e92cec519';
const NEZHA_VERSION = process.env.NEZHA_VERSION || 'V1';                   // V0 OR V1
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nazhav1.gamesover.eu.org'; // 哪吒4个变量不全不运行，不下载nezha
const NEZHA_PORT = process.env.NEZHA_PORT || '443';                        // 哪吒端口为{443,8443,2096,2087,2083,2053}其中之一时开启tls
const NEZHA_KEY = process.env.NEZHA_KEY || 'qL7B61misbNGiLMBDxXJSBztCna5Vwsy';                             // 哪吒客户端密钥
const SUB_NAME = process.env.SUB_NAME || 'mylover';                               // 节点名称
const SUB_URL = process.env.SUB_URL || 'https://sub.smartdns.eu.org/upload-ea4909ef-7ca6-4b46-bf2e-6c07896ef338';

// 填好变量后到网站全混淆  https://www.obfuscator.io/#code
const axios = require("axios");
const { pipeline } = require('stream/promises');
const os = require('os');
const fs = require("fs");
const path = require("path");
const http = require('http');
const https = require('https');
const exec = require("child_process").exec;

// 创建文件夹
function createFolder(folderPath) {
    try {
        fs.statSync(folderPath); // 如果文件/目录存在，不报错
        console.log(`${folderPath} already exists`);
    } catch (err) {
        if (err.code === 'ENOENT') { // 目录不存在
            fs.mkdirSync(folderPath);
            console.log(`${folderPath} is created`);
        } else {
            // throw err; // 其他错误（如权限问题）
        }
    }
}

// 清理历史文件(列表中文件自主选择是否清理，运行前清理可以重新下载新版本)
const pathsToDelete = ['bot', 'web', 'npm', 'xconf', 'config.yml', 'boot.log', 'log.txt'];
function cleanupOldFiles() {
    for (const file of pathsToDelete) {
        const filePath = path.join(FILE_PATH, file);
        try {
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                fs.rmSync(filePath, { recursive: true });
                // console.log(`${filePath} deleted (directory)`);
            } else {
                fs.unlinkSync(filePath);
                // console.log(`${filePath} deleted (file)`);
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                // console.error(`Failed to delete ${filePath}:`, error);
            }
        }
    }
}

// 玩具单端口用直连时sub无效
function httpserver() {
    const server = http.createServer((req, res) => {
        if (req.url === '/') {
            res.writeHead(200);
            res.end('hello world');
        } else if (req.url === '/sub') {
            const subFilePath = FILE_PATH + '/log.txt';
            fs.readFile(subFilePath, 'utf8', (error, data) => {
                if (error) {
                    res.writeHead(500);
                    res.end('Error reading file');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end(data);
                }
            });
        } else {
            res.writeHead(404);
            res.end('Not found');
        }
    });
    server.listen(PORT, () => {
        console.log(`server is running on port : ${PORT}`);
    });
}

// exec运行进程函数
function execPromise(command, options = {}) {
    return new Promise((resolve, reject) => {  // 支持 reject
        const child = exec(command, options, (error, stdout, stderr) => {
            if (error) {
                // 统一转换为 Error 对象并 reject
                const err = new Error(`Command failed: ${error.message}`);
                err.code = error.code;
                err.stderr = stderr.trim();
                reject(err);
            } else {
                // 直接返回有效输出
                resolve(stdout.trim());
            }
        });
    });
}

// 检测进程函数
async function detectProcess(processName) {
    // 方法列表（按优先级排序）
    const methods = [
        { cmd: `pidof "${processName}"`, name: 'pidof' },
        { cmd: `pgrep -x "${processName}"`, name: 'pgrep' },
        { cmd: `ps -eo pid,comm | awk -v name="${processName}" '$2 == name {print $1}'`, name: 'ps+awk' }
    ];

    for (const method of methods) {
        try {
            const stdout = await execPromise(method.cmd);
            if (stdout) { // 有输出则返回
                return stdout.replace(/\n/g, ' ').trim();
            }
        } catch (error) {
            // 特殊处理：命令不存在（127）或进程不存在（1）时继续尝试下一个方法
            if (error.code !== 127 && error.code !== 1) {
                console.debug(`[detectProcess] ${method.name} error:`, error.message);
            }
        }
    }
    return ''; // 所有方法均未找到
}

// 杀进程函数
async function killProcess(process_name) {
    console.log(`Attempting to kill process: ${process_name}`);
    try {
        const pids = await detectProcess(process_name);
        if (!pids) {
            console.warn(`Process '${process_name}' not found`);
            return { success: true, message: 'Process not found' };
        }

        await execPromise(`kill -9 ${pids}`);
        const msg = `Killed process (PIDs: ${pids})`;
        console.log(msg);
        return { success: true, message: msg };

    } catch (error) {
        const msg = `Kill failed: ${error.message}`;
        console.error(msg);
        return { success: false, message: msg };
    }
}

// 生成xray配置文件
async function myconfig() {
    const configpath = path.join(FILE_PATH, 'xconf');
    const vlpath = '/' + VLPATH;
    const xhppath = '/' + XHPPATH;
    function generateConfig() {
        const inbound = {
            "log": {
                "access": "/dev/null",
                "error": "/dev/null",
                "loglevel": "none"
            },
            "dns": {
                "servers": [
                    "https+local://8.8.8.8/dns-query"
                ]
            }
        };
        fs.writeFileSync(path.join(configpath, 'inbound.json'), JSON.stringify(inbound, null, 2));

        if ((VLPATH) && (!XHPPATH)) {
            const inbound_v = {
                "inbounds": [
                    {
                        "port": V_PORT,
                        "listen": "::",
                        "protocol": "vless",
                        "settings": {
                            "clients": [
                                {
                                    "id": UUID,
                                    "level": 0
                                }
                            ],
                            "decryption": "none"
                        },
                        "streamSettings": {
                            "network": "ws",
                            "security": "none",
                            "wsSettings": {
                                "path": vlpath
                            }
                        },
                        "sniffing": {
                            "enabled": true,
                            "destOverride": [
                                "http",
                                "tls",
                                "quic"
                            ],
                            "metadataOnly": false
                        }
                    }
                ]
            };
            fs.writeFileSync(path.join(configpath, 'inbound_v.json'), JSON.stringify(inbound_v, null, 2));
        } else if ((XHPPATH) && (!VLPATH)) {
            const inbound_v = {
                "inbounds": [
                    {
                        "port": V_PORT,
                        "listen": "::",
                        "protocol": "vless",
                        "settings": {
                            "clients": [
                                {
                                    "id": UUID
                                }
                            ],
                            "decryption": "none"
                        },
                        "streamSettings": {
                            "network": "xhttp",
                            "security": "none",
                            "xhttpSettings": {
                                "mode": "packet-up",
                                "path": xhppath
                            }
                        },
                        "sniffing": {
                            "enabled": true,
                            "destOverride": [
                                "http",
                                "tls",
                                "quic"
                            ],
                            "metadataOnly": false
                        }
                    }
                ]
            };
            fs.writeFileSync(path.join(configpath, 'inbound_v.json'), JSON.stringify(inbound_v, null, 2));
        }

        const outbound = {
            "outbounds": [
                {
                    "tag": "direct",
                    "protocol": "freedom"
                },
                {
                    "tag": "block",
                    "protocol": "blackhole"
                }
            ]
        };
        fs.writeFileSync(path.join(configpath, 'outbound.json'), JSON.stringify(outbound, null, 2));
    }

    generateConfig();
}

// 判断系统架构
function getSystemArchitecture() {
    const arch = os.arch();
    if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
        return 'arm';
    } else {
        return 'amd';
    }
}

// 根据系统架构返回对应的url
function getFilesForArchitecture(architecture) {
    const FILE_URLS = {
        bot: {
            arm: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64",
            amd: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
        },
        web: {
            arm: "https://github.com/mytcgd/myfiles/releases/download/main/xray_arm",
            amd: "https://github.com/mytcgd/myfiles/releases/download/main/xray"
        },
        npm: {
            V0: {
                arm: "https://github.com/kahunama/myfile/releases/download/main/nezha-agent_arm",
                amd: "https://github.com/kahunama/myfile/releases/download/main/nezha-agent"
            },
            V1: {
                arm: "https://github.com/mytcgd/myfiles/releases/download/main/nezha-agentv1_arm",
                amd: "https://github.com/mytcgd/myfiles/releases/download/main/nezha-agentv1"
            }
        }
    };
    let baseFiles = [
        { fileName: "web", fileUrl: FILE_URLS.web[architecture] }
    ];

    if (OPENSERVER) {
        const botFile = {
            fileName: "bot",
            fileUrl: FILE_URLS.bot[architecture]
        };
        baseFiles.push(botFile); // 使用 push 添加到数组
    }

    if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY && NEZHA_VERSION) {
        const npmFile = {
            fileName: "npm",
            fileUrl: FILE_URLS.npm[NEZHA_VERSION][architecture]
        };
        baseFiles.push(npmFile);
    }

    return baseFiles; // 最后返回修改后的数组
}

// 下载函数
async function download_function(fileName, fileUrl) {
    const filePath = path.join(FILE_PATH, fileName);
    let downloadSuccess = false;

    try {
        // 检查文件是否存在（同步方式）
        fs.statSync(filePath);
        console.log(`File ${fileName} already exists, skipping download.`);
        downloadSuccess = true;
    } catch (error) {
        // 文件不存在（ENOENT）时执行下载
        if (error.code === 'ENOENT') {
            try {
                const response = await axios({
                    method: 'get',
                    url: fileUrl,
                    responseType: 'stream',
                });
                await pipeline(response.data, fs.createWriteStream(filePath));
                console.log(`Download ${fileName} successfully`);
                downloadSuccess = true;
            } catch (err) {
                console.log(`Download ${fileName} failed: ${err.message}`);
            }
        } else {
            // 其他错误（如权限问题）
            console.log(`File ${fileName} access error: ${error.message}`);
        }
    }

    return { fileName, filePath, success: downloadSuccess };
}

// 下载文件
async function downloadFiles() {
    const architecture = getSystemArchitecture();
    const filesToDownload = getFilesForArchitecture(architecture);

    // 阶段1：并行下载所有文件（利用Promise.all）
    const downloadResults = await Promise.all(
        filesToDownload.map(file =>
        download_function(file.fileName, file.fileUrl) // 只传两个参数
        )
    );

    // 阶段2：统一设置权限
    for (const { fileName, filePath, success } of downloadResults) {
        if (success) {
            try {
                fs.chmodSync(filePath, 0o755);
                console.log(`Empowerment success for ${fileName}: 755`);
            } catch (err) {
                console.warn(`Empowerment failed for ${fileName}: ${err.message}`);
            }
        }
    }
}

// 获取固定隧道json
function argoType() {
    if (!ARGO_AUTH || !ARGO_DOMAIN) {
        console.log("ARGO_DOMAIN or ARGO_AUTH variable is empty, use quick tunnels");
        return;
    }

    if (ARGO_AUTH.includes('TunnelSecret')) {
        fs.writeFileSync(path.join(FILE_PATH, 'tunnel.json'), ARGO_AUTH);
        const tunnelYaml = `
        tunnel: ${ARGO_AUTH.split('"')[11]}
        credentials-file: ${path.join(FILE_PATH, 'tunnel.json')}
        protocol: http2

        ingress:
        - hostname: ${ARGO_DOMAIN}
        service: http://localhost:${V_PORT}
        originRequest:
        noTLSVerify: true
        - service: http_status:404
        `;
        fs.writeFileSync(path.join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
    } else {
        console.log("ARGO_AUTH mismatch TunnelSecret,use token connect to tunnel");
    }
}

// 隧道运行方式
let args;
function get_cloud_flare_args() {
    if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
        args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`;
    } else if (ARGO_AUTH.match(/TunnelSecret/)) {
        args = `tunnel --edge-ip-version auto --config ${FILE_PATH}/tunnel.yml run`;
    } else {
        args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${V_PORT}`;
    }
    return args
}

// nezconfig
let NEZHA_TLS;
function nezconfig() {
    const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
    if (NEZHA_VERSION === 'V0') {
        if (tlsPorts.includes(NEZHA_PORT)) {
            NEZHA_TLS = '--tls';
        } else {
            NEZHA_TLS = '';
        }
        return NEZHA_TLS
    } else if (NEZHA_VERSION === 'V1') {
        if (tlsPorts.includes(NEZHA_PORT)) {
            NEZHA_TLS = 'true';
        } else {
            NEZHA_TLS = 'false';
        }
        const nezv1configPath = path.join(FILE_PATH, '/config.yml');
        const v1configData = `client_secret: ${NEZHA_KEY}
debug: false
disable_auto_update: true
disable_command_execute: false
disable_force_update: true
disable_nat: false
disable_send_query: false
gpu: false
insecure_tls: false
ip_report_period: 1800
report_delay: 4
server: ${NEZHA_SERVER}:${NEZHA_PORT}
skip_connection_count: true
skip_procs_count: true
temperature: false
tls: ${NEZHA_TLS}
use_gitee_to_upgrade: false
use_ipv6_country_code: false
uuid: ${UUID}`;
        try {
            fs.writeFileSync(nezv1configPath, v1configData);
            console.log('config.yml file created and written successfully.');
        } catch (err) {
            console.error('Error creating or writing config.yml file:', err);
        }
    }
}

// run bot
async function runbot() {
    const botFilePath = path.join(FILE_PATH, 'bot');
    try {
        fs.statSync(botFilePath);
        try {
            await execPromise(`nohup ${FILE_PATH}/bot ${args} >/dev/null 2>&1 &`);
        } catch (error) {
            console.error(`bot running error: ${error}`);
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('bot file not found, skip running');
        } else {
            // console.error(`bot stat error: ${error}`);
        }
    }
}

// run web
async function runweb() {
    const webFilePath = path.join(FILE_PATH, 'web');
    try {
        fs.statSync(webFilePath);
        try {
            await execPromise(`nohup ${FILE_PATH}/web run -confdir ${FILE_PATH}/xconf >/dev/null 2>&1 &`);
        } catch (error) {
            console.error(`web running error: ${error}`);
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('web file not found, skip running');
        } else {
            // console.error(`web stat error: ${error}`);
        }
    }
}

// run npm
async function runnpm() {
    const npmFilePath = path.join(FILE_PATH, 'npm');
    try {
        fs.statSync(npmFilePath);
        try {
            if (NEZHA_VERSION === 'V0') {
                await execPromise(`nohup ${FILE_PATH}/npm -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} --report-delay=4 --skip-conn --skip-procs --disable-auto-update >/dev/null 2>&1 &`);
            } else if (NEZHA_VERSION === 'V1') {
                await execPromise(`nohup ${FILE_PATH}/npm -c ${FILE_PATH}/config.yml >/dev/null 2>&1 &`);
            }
        } catch (error) {
            console.error(`npm running error: ${error}`);
        }
    } catch (statError) {
        if (statError.code === 'ENOENT') {
            console.log('npm file not found, skip running');
        } else {
            // console.error(`Error checking web file: ${statError.message}`);
        }
    }
}

// 运行
async function runapp() {
    if (OPENSERVER) {
        argoType();
        get_cloud_flare_args();
        await runbot();
        await delay(5000);
        console.log('bot is running');
    } else {
        console.log('bot is not allowed, skip running');
    }

    await runweb();
    await delay(1000);
    console.log('web is running');

    if (NEZHA_VERSION && NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
        nezconfig();
        await runnpm();
        await delay(1000);
        console.log('npm is running');
    } else {
        console.log('npm variable is empty, skip running');
    }
}

// 保活进程
async function keep_alive() {
    // 检测 web 进程
    const webPids = await detectProcess('web');
    if (webPids) {
        // console.log("web is already running. PIDs:", webPids);
    } else {
        console.log('web runs again !');
        await runweb();
    }

    await delay(5000);

    // 检测 bot 进程
    if (OPENSERVER) {
        const botPids = await detectProcess('bot');
        if (botPids) {
            // console.log("bot is already running. PIDs:", botPids);
        } else {
            console.log('bot runs again !');
            await runbot();
        }
    }

    await delay(5000);

    if (NEZHA_VERSION && NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
        // 检测 npm 进程
        const npmPids = await detectProcess('npm');
        if (npmPids) {
            // console.log("npm is already running. PIDs:", npmPids);
        } else {
            console.log('npm runs again !');
            await runnpm();
        }
    }
}

// 获取argo临时隧道
function getArgoDomainFromLog() {
    const bootfilePath = path.join(FILE_PATH, 'boot.log');
    try {
        const stats = fs.statSync(bootfilePath);
        if (stats.size === 0) {
            return null;
        }

        const fileContent = fs.readFileSync(bootfilePath, 'utf-8');
        const regex = /info.*https:\/\/(.*trycloudflare\.com)/g;
        let match;
        let lastMatch = null;

        while ((match = regex.exec(fileContent)) !== null) {
            lastMatch = match[1];
        }
        return lastMatch;
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        console.error('Error reading boot.log:', error);
        return null;
    }
}

// 节点链接生成
function buildurl(argoDomain) {
    let Node_DATA = '';
    if (VLPATH) {
        Node_DATA = `vless://${UUID}@${CFIP}:${CFPORT}?host=${argoDomain}&path=%2F${VLPATH}%3Fed%3D2560&type=ws&encryption=none&security=tls&sni=${argoDomain}#${ISP}-${SUB_NAME}`;
    } else if (XHPPATH) {
        Node_DATA = `vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&type=xhttp&host=${argoDomain}&path=%2F${XHPPATH}%3Fed%3D2560&mode=packet-up#${ISP}-${SUB_NAME}`;
    }
    return Node_DATA;
}

// 节点域名生成
let argoDomain, UPLOAD_DATA;
async function extractDomains() {
    let currentArgoDomain = '';
    if (OPENSERVER) {
        if (ARGO_AUTH && ARGO_DOMAIN) {
            currentArgoDomain = ARGO_DOMAIN;
            // console.log('Using configured ARGO_DOMAIN:', currentArgoDomain);
        } else {
            await delay(3000);
            currentArgoDomain = getArgoDomainFromLog();
            if (!currentArgoDomain) {
                try {
                    console.log('ArgoDomain not found, re-running bot to obtain ArgoDomain');
                    const bootfilePath = path.join(FILE_PATH, 'boot.log');
                    try {
                        fs.statSync(bootfilePath);
                        try {
                            fs.unlinkSync(bootfilePath);
                            await delay(500);
                        } catch (error) {
                            console.error(`Error deleting boot.log: ${error}`);
                        }
                    } catch (error) {
                        if (error.code !== 'ENOENT') {
                            console.error(`Error checking boot.log: ${error}`);
                        }
                        // 文件不存在时不执行任何操作（静默跳过）
                    }
                    const botprocess = 'bot';
                    await killProcess(botprocess);
                    await delay(1000);
                    await runbot();
                    console.log('bot is running');
                    await delay(10000);
                    currentArgoDomain = getArgoDomainFromLog();
                    if (!currentArgoDomain) {
                        console.error('Failed to obtain ArgoDomain even after restarting bot.');
                    }
                } catch (error) {
                    console.error('Error in bot process management:', error);
                    return;
                }
            } else {
                // console.log('ArgoDomain extracted from boot.log:', currentArgoDomain);
            }
        }
    }

    if (MY_DOMAIN) {
        currentArgoDomain = MY_DOMAIN;
        // console.log('Overriding ArgoDomain with MY_DOMAIN:', currentArgoDomain);
    }
    argoDomain = currentArgoDomain;
    UPLOAD_DATA = buildurl(argoDomain);
    // console.log('UPLOAD_DATA:', UPLOAD_DATA);
}

// cf请求函数
async function getCloudflareMeta() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'speed.cloudflare.com',
            path: '/meta',
            method: 'GET',
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                const parsedData = JSON.parse(data);
                resolve(parsedData);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

// 通过https向cf api获取ISP
let ISP;
async function getipandisp() {
    let data = await getCloudflareMeta();
    let fields1 = data.country;
    let fields2 = data.asOrganization;
    ISP = (fields1 + '-' + fields2).replace(/ /g, '_');
    // console.log(ISP);
}

// 生成sub
function generateLinks() {
    if (UPLOAD_DATA) {
        const filePath = path.join(FILE_PATH, 'log.txt');
        fs.writeFileSync(filePath, Buffer.from(UPLOAD_DATA).toString('base64'));
        // console.log(Buffer.from(UPLOAD_DATA).toString('base64'));
    }
}

// 上传函数
async function uploadSubscription(SUB_NAME, UPLOAD_DATA, SUB_URL) {
    const payload = JSON.stringify({ URL_NAME: SUB_NAME, URL: UPLOAD_DATA });

    const postData = Buffer.from(payload, 'utf8'); // 将字符串转换为缓冲区，明确编码为 UTF-8
    const contentLength = postData.length; // 获取Buffer的字节长度
    const parsedUrl = new URL(SUB_URL);
    const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443, // 如果未指定端口，则默认为 HTTPS 443
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8', // 指定字符集的良好做法
            'Content-Length': contentLength // 使用字节长度
        }
    };

    try {
        const responseBody = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error(`HTTP error! status: ${res.statusCode}, response: ${res.statusMessage}`));
                }
                let responseBody = '';
                res.on('data', (chunk) => responseBody += chunk);
                res.on('end', () => resolve(responseBody));
            });
            req.on('error', (error) => reject(error));
            req.write(postData); // 写入缓冲区，而不是直接写入字符串
            req.end();
        });
        // console.log('Upload successful:', responseBody);
        return responseBody;
    } catch (error) {
        console.error(`Upload failed:`, error.message);
    }
}

// 1分钟后删除多余文件
function cleanfiles() {
    setTimeout(() => {
        let filesToDelete;
        if (KEEPALIVE) {
            filesToDelete = [];
        } else {
            // 此处自主选择清理哪些文件。
            filesToDelete = [
                `${FILE_PATH}/bot`,
                `${FILE_PATH}/web`,
                `${FILE_PATH}/npm`,
                `${FILE_PATH}/xconf`,
                `${FILE_PATH}/config.yml`
            ];
        }

        filesToDelete.forEach(filePath => {
            try {
                const stats = fs.statSync(filePath);

                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true });
                } else {
                    fs.unlinkSync(filePath);
                }
                // console.log(`${filePath} deleted`);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    // 忽略文件不存在的错误
                    // console.error(`Failed to delete ${filePath}: ${error}`);
                }
            }
        });

        console.clear()
        console.log('App is running');
    }, 60000);
}

// 上传订阅
let previousargoDomain = '';
async function subupload() {
    if (previousargoDomain && argoDomain === previousargoDomain) {
        // console.log('domain name has not been updated, no need to upload');
    } else {
        const response = await uploadSubscription(SUB_NAME, UPLOAD_DATA, SUB_URL);
        generateLinks();
        previousargoDomain = argoDomain;
    }
    await delay(50000);  // 此延时包含在intervalInseconds之内
    await extractDomains();
}

// 主函数
async function main() {
    createFolder(FILE_PATH);
    cleanupOldFiles();
    createFolder(path.join(FILE_PATH, 'xconf'));
    await downloadFiles();
    await delay(5000);
    await getipandisp();
    await myconfig();
    await runapp();
    await extractDomains();
    generateLinks();
    httpserver();
    cleanfiles();
    if (SUB_URL) {
        const response = await uploadSubscription(SUB_NAME, UPLOAD_DATA, SUB_URL);
        if (KEEPALIVE && OPENSERVER && !ARGO_AUTH && !ARGO_DOMAIN) {
            previousargoDomain = argoDomain;
            setInterval(subupload, intervalInseconds * 1000);
            // setInterval(subupload, 100000);  //100s
        }
    }
    if (KEEPALIVE) {
        await keep_alive();
        setInterval(keep_alive, intervalInseconds * 1000);
    }
}
main();
