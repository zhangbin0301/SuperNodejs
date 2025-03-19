const FILE_PATH = process.env.FILE_PATH || './.npm'; // 运行文件夹，节点文件存放目录
const projectPageURL = process.env.URL || '';        // 填写项目域名可开启自动访问保活，非标端口的前缀是http://
const intervalInseconds = process.env.TIME || 120;   // 自动访问间隔时间（120秒），这个也是上传间隔时间。
const CFIP = process.env.CFIP || 'ip.sb';                         // 优选域名或优选ip
const CFPORT = process.env.CFPORT || '443';                         // 节点端口 443 2053 2083 2087 2096 8443
const VLPATH = process.env.VLPATH || 'startvl';
const VMPATH = process.env.VMPATH || 'startvm';
const ARGO_PORT = process.env.ARGO_PORT || 8080;                  // argo端口，使用固定隧道token需和cf后台设置的端口对应
const SUB_URL = process.env.SUB_URL || 'https://sub.smartdns.eu.org/upload-ea4909ef-7ca6-4b46-bf2e-6c07896ef338';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));  // 延时参数,ms是毫秒 1000ms=1秒

const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';                // 固定隧道域名，留空即启用临时隧道
const ARGO_AUTH = process.env.ARGO_AUTH || '';                    // 固定隧道json或token，留空即启用临时隧道

const UUID = process.env.UUID || 'ea4909ef-7ca6-4b46-bf2e-6c07896ef338';
const NEZHA_VERSION = process.env.NEZHA_VERSION || 'V0';     // V0 OR V1
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nazhe.841013.xyz';     // 哪吒3个变量不全不运行
const NEZHA_PORT = process.env.NEZHA_PORT || '443';               // 哪吒端口为{443,8443,2096,2087,2083,2053}其中之一时开启tls或true
const NEZHA_KEY = process.env.NEZHA_KEY || 'eAFhklcOEZmZRxI0FG';                    // 哪吒客户端密钥
const SUB_NAME = process.env.SUB_NAME || 'Appwrite.io';                        // 节点名称

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

// 填好变量后到网站全混淆  https://www.obfuscator.io/#code
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const http = require('http');
const https = require('https');
const exec = require("child_process").exec;
const { execSync } = require('child_process');

// 创建文件夹函数
function createFolder(folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
        // console.log(`${folderPath} is created`);
    } else {
        // console.log(`${folderPath} already exists`);
    }
}

// 清理历史文件
const pathsToDelete = ['bot', 'web', 'npm', 'xconf', 'config.yml', 'boot.log', 'log.txt'];
function cleanupOldFiles() {
    pathsToDelete.forEach((file) => {
        const filePath = path.join(FILE_PATH, file);

        try {
            if (fs.existsSync(filePath)) {
                if (fs.statSync(filePath).isDirectory()) {
                    fs.rmSync(filePath, { recursive: true });
                    console.log(`${filePath} deleted`);
                } else {
                    fs.unlinkSync(filePath);
                    console.log(`${filePath} deleted`);
                }
            } else {
                console.error(`Skip Delete ${filePath}`);
            }
        } catch (err) {
            console.error(`Failed to delete ${filePath}: ${err}`);
        }
    });
}

// 根目录
function httpserver() {
    const server = http.createServer((req, res) => {
        if (req.url === '/') {
            res.writeHead(200);
            res.end('hello world');
        } else if (req.url === '/healthcheck') {
            res.writeHead(200);
            res.end('ok');
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

// 生成xray配置文件
const configpath = path.join(FILE_PATH, 'xconf');
async function myconfig() {
    const vlpath = '/' + VLPATH;
    const vmpath = '/' + VMPATH;

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
            },
            "inbounds": [
                {
                    "port": ARGO_PORT,
                    "protocol": "vless",
                    "settings": {
                        "clients": [
                            {
                                "id": UUID,
                                "flow": "xtls-rprx-vision"
                            }
                        ],
                        "decryption": "none",
                        "fallbacks": [
                            {
                                "path": vlpath,
                                "dest": 3002
                            },
                            {
                                "path": vmpath,
                                "dest": 3003
                            }
                        ]
                    },
                    "streamSettings": {
                        "network": "tcp"
                    }
                },
                {
                    "port": 3002,
                    "listen": "127.0.0.1",
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
                },
                {
                    "port": 3003,
                    "listen": "127.0.0.1",
                    "protocol": "vmess",
                    "settings": {
                        "clients": [
                            {
                                "id": UUID,
                                "alterId": 0
                            }
                        ]
                    },
                    "streamSettings": {
                        "network": "ws",
                        "wsSettings": {
                            "path": vmpath
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
        fs.writeFileSync(path.join(configpath, 'inbound.json'), JSON.stringify(inbound, null, 2));

        const outbound = {
            "outbounds": [
                {
                    "protocol": "freedom",
                    "tag": "direct"
                },
                {
                    "tag": "WARP",
                    "protocol": "wireguard",
                    "settings": {
                        "secretKey": "YFYOAdbw1bKTHlNNi+aEjBM3BO7unuFC5rOkMRAz9XY=",
                        "address": [
                            "172.16.0.2/32",
                            "2606:4700:110:8a36:df92:102a:9602:fa18/128"
                        ],
                        "peers": [
                            {
                                "publicKey": "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
                                "allowedIPs": [
                                    "0.0.0.0/0",
                                    "::/0"
                                ],
                                "endpoint": "162.159.193.10:2408"
                            }
                        ],
                        "reserved": [78, 135, 76],
                        "mtu": 1280
                    }
                }
            ],
            "routing": {
                "domainStrategy": "AsIs",
                "rules": [
                    {
                        "type": "field",
                        "domain": [
                            "domain:openai.com",
                            "domain:ai.com",
                            "domain:chat.openai.com",
                            "domain:chatgpt.com"
                        ],
                        "outboundTag": "WARP"
                    }
                ]
            }
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

// 下载对应系统架构的依赖文件
function downloadFile(fileName, fileUrl, callback) {
    const filePath = path.join(FILE_PATH, fileName);

    // Check if file already exists，skipping download
    if (fs.existsSync(filePath)) {
        console.log(`File ${fileName} already exists, skipping download.`);
        callback(null, fileName);
        return;
    }

    const writer = fs.createWriteStream(filePath);

    axios({
        method: 'get',
        url: fileUrl,
        responseType: 'stream',
    })
    .then(response => {
        response.data.pipe(writer);

        writer.on('finish', () => {
            writer.close();
            console.log(`Download ${fileName} successfully`);
            callback(null, fileName);
        });

        writer.on('error', err => {
            fs.unlink(filePath, () => { });
            const errorMessage = `Download ${fileName} failed: ${err.message}`;
            console.error(errorMessage); // Print error message when download fails
            callback(errorMessage);
        });
    })
    .catch(err => {
        const errorMessage = `Download ${fileName} failed: ${err.message}`;
        console.error(errorMessage); // Print error message when download fails
        callback(errorMessage);
    });
}

// 下载并运行依赖文件
async function downloadFiles() {
    const architecture = getSystemArchitecture();
    const filesToDownload = getFilesForArchitecture(architecture);

    if (filesToDownload.length === 0) {
        console.log(`Can't find a file for the current architecture`);
        return;
    }

    const downloadPromises = filesToDownload.map(fileInfo => {
        return new Promise((resolve, reject) => {
            downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, fileName) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(fileName);
                }
            });
        });
    });

    try {
        await Promise.all(downloadPromises); // Wait for all files to be downloaded
    } catch (err) {
        console.error('Error downloading files:', err);
        return;
    }

    // 授权和运行
    function authorizeFiles(filePaths) {
        const newPermissions = 0o775;

        filePaths.forEach(relativeFilePath => {
            const absoluteFilePath = path.join(FILE_PATH, relativeFilePath);

            fs.chmod(absoluteFilePath, newPermissions, (err) => {
                if (err) {
                    console.error(`Empowerment failed for ${absoluteFilePath}: ${err}`);
                } else {
                    console.log(`Empowerment success for ${absoluteFilePath}: ${newPermissions.toString(8)}`);
                }
            });
        });
    }
    const filesToAuthorize = ['./bot', './web', './npm'];
    authorizeFiles(filesToAuthorize);
}

// 根据系统架构返回对应的url
function getFilesForArchitecture(architecture) {
    if (NEZHA_VERSION === 'V0') {
        if (architecture === 'arm') {
            return [
                { fileName: "bot", fileUrl: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" },
                { fileName: "web", fileUrl: "https://github.com/mytcgd/myfiles/releases/download/main/xray_arm" },
                { fileName: "npm", fileUrl: "https://github.com/kahunama/myfile/releases/download/main/nezha-agent_arm" },
            ];
        } else if (architecture === 'amd') {
            return [
                { fileName: "bot", fileUrl: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" },
                { fileName: "web", fileUrl: "https://github.com/mytcgd/myfiles/releases/download/main/xray" },
                { fileName: "npm", fileUrl: "https://github.com/kahunama/myfile/releases/download/main/nezha-agent" },
            ];
        }
    } else if (NEZHA_VERSION === 'V1') {
        if (architecture === 'arm') {
            return [
                { fileName: "bot", fileUrl: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" },
                { fileName: "web", fileUrl: "https://github.com/mytcgd/myfiles/releases/download/main/xray_arm" },
                { fileName: "npm", fileUrl: "https://github.com/mytcgd/myfiles/releases/download/main/nezha-agentv1_arm" },
            ];
        } else if (architecture === 'amd') {
            return [
                { fileName: "bot", fileUrl: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" },
                { fileName: "web", fileUrl: "https://github.com/mytcgd/myfiles/releases/download/main/xray" },
                { fileName: "npm", fileUrl: "https://github.com/mytcgd/myfiles/releases/download/main/nezha-agentv1" },
            ];
        }
    }
    return [];
}

// 获取固定隧道json
function argoType() {
    if (!ARGO_AUTH || !ARGO_DOMAIN) {
        // console.log("ARGO_DOMAIN or ARGO_AUTH variable is empty, use quick tunnels");
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
        service: http://localhost:${ARGO_PORT}
        originRequest:
        noTLSVerify: true
        - service: http_status:404
        `;
        fs.writeFileSync(path.join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
    } else {
        // console.log("ARGO_AUTH mismatch TunnelSecret,use token connect to tunnel");
    }
}

// nezv1config
let NEZHA_TLS = '';
function nezv1config() {
    const v1configData = `
    client_secret: ${NEZHA_KEY}
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
    uuid: ${UUID}
    `;

    // 构建文件路径
    const nezv1configPath = path.join(FILE_PATH, '/config.yml');

    // 写入配置文件
    try {
        fs.writeFileSync(nezv1configPath, v1configData);
        console.log('config.yml file created and written successfully.');
    } catch (err) {
        console.error('Error creating or writing config.yml file:', err);
    }
}

// 运行
async function runapp() {
    // 运行cloudfared
    if (fs.existsSync(path.join(FILE_PATH, 'bot'))) {
        let args;

        if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
            args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`;
        } else if (ARGO_AUTH.match(/TunnelSecret/)) {
            args = `tunnel --edge-ip-version auto --config ${FILE_PATH}/tunnel.yml run`;
        } else {
            args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
        }

        try {
            await exec(`nohup ${FILE_PATH}/bot ${args} >/dev/null 2>&1 &`);
            console.log('bot is running');
            await delay(2000);
        } catch (error) {
            console.error(`Error executing command: ${error}`);
        }
    }
    await delay(5000);

    // 运行xray
    if (fs.existsSync(path.join(FILE_PATH, 'web'))) {
        const command = `nohup ${FILE_PATH}/web run -confdir ${FILE_PATH}/xconf/ > /dev/null 2>&1 &`;
        try {
            await exec(command);
            console.log('web is running');
            await delay(2000);
        } catch (error) {
            console.error(`web running error: ${error}`);
        }
    }

    // 运行nezha
    if (fs.existsSync(path.join(FILE_PATH, 'npm'))) {
        const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
        if (NEZHA_VERSION === 'V0') {
            if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
                if (tlsPorts.includes(NEZHA_PORT)) {
                    NEZHA_TLS = '--tls';
                } else {
                    NEZHA_TLS = '';
                }
                const command1 = `nohup ${FILE_PATH}/npm -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} > /dev/null 2>&1 &`;
                try {
                    await exec(command1);
                    console.log('npm is running');
                    await delay(1000);
                } catch (error) {
                    console.error(`npm running error: ${error}`);
                }
            } else {
                console.log('npm variable is empty,skip running');
            }
        } else if (NEZHA_VERSION === 'V1') {
            if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
                if (tlsPorts.includes(NEZHA_PORT)) {
                    NEZHA_TLS = 'true';
                } else {
                    NEZHA_TLS = 'false';
                }
                nezv1config();
                const command2 = `nohup ${FILE_PATH}/npm -c ${FILE_PATH}/config.yml > /dev/null 2>&1 &`;
                try {
                    await exec(command2);
                    console.log('npm is running');
                    await delay(1000);
                } catch (error) {
                    console.error(`npm running error: ${error}`);
                }
            } else {
                console.log('npm variable is empty,skip running');
            }
        }
    }
}

// 获取argoDomain
async function extractDomains() {
    let argoDomain;

    if (ARGO_AUTH && ARGO_DOMAIN) {
        argoDomain = ARGO_DOMAIN;
        // console.log('ARGO_DOMAIN:', argoDomain);
        await generateLinks(argoDomain);
    } else {
        try {
            await delay(10000);
            const bootfilePath = path.join(FILE_PATH, 'boot.log');
            if (fs.existsSync(bootfilePath) && fs.statSync(bootfilePath).size > 0) {
                const fileContent = fs.readFileSync(bootfilePath, 'utf-8');
                const regex = /info.*https:\/\/(.*trycloudflare\.com)/g;
                let match;
                let lastMatch = null;

                while ((match = regex.exec(fileContent)) !== null) {
                    lastMatch = match[1];
                }

                if (lastMatch) {
                    argoDomain = lastMatch;
                }
                // console.log('ARGO_DOMAIN:', argoDomain);
                await generateLinks(argoDomain);
            } else {
                exec("pidof bot", async (err, stdout) => {
                    if (stdout.trim() !== "") {
                        // console.log('Bot is already running.');
                        await extractDomains();
                    } else {
                        const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
                        const command3 = `nohup ${FILE_PATH}/bot ${args} >/dev/null 2>&1 &`;
                        exec(command3, async (err) => {
                            if (err) {
                                console.error(`Error starting bot: ${err}`);
                            } else {
                                // console.log('Bot started successfully.');
                                await delay(3000);
                                await extractDomains();
                            }
                        });
                    }
                });
            }
        } catch (error) {
            // console.error('Error reading boot.log:', error);
        }
    }
}

// 通过https向cf api获取ISP
let ISP, MYIP;
async function getipandisp() {
    let data = await getCloudflareMeta();
    let fields1 = data.country;
    let fields2 = data.asOrganization;
    ISP = (fields1 + '-' + fields2).replace(/ /g, '_');
    // console.log(ISP);
}

// 生成sub
let UPLOAD_DATA;
let previousArgoDomain = '';
async function generateLinks(argoDomain) {
    let VMESS, vmess_url, vless_url, subTxt;

    if (previousArgoDomain && argoDomain === previousArgoDomain) {
        // console.log('ArgoDomain has not changed. Skipping writing to log.txt.');
        return;
    }

    try {
        // VMESS = { v: '2', ps: `${ISP}-${SUB_NAME}`, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/startvm?ed=2048', tls: 'tls', sni: argoDomain, alpn: '' };
        VMESS = {
            v: '2',
            ps: `${ISP}-${SUB_NAME}`,
            add: CFIP,
            port: CFPORT,
            id: UUID,
            aid: '0',
            scy: 'none',
            net: 'ws',
            type: 'none',
            host: argoDomain,
            path: `/${VMPATH}?ed=2048`,
            tls: 'tls',
            sni: argoDomain,
            alpn: ''
        };

        vmess_url = `vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
        vless_url = `vless://${UUID}@${CFIP}:${CFPORT}?host=${argoDomain}&path=%2F${VLPATH}%3Fed%3D2048&type=ws&encryption=none&security=tls&sni=${argoDomain}#${ISP}-${SUB_NAME}`;

        subTxt = `${vmess_url}\n${vless_url}`;

        if (SUB_URL) {
            UPLOAD_DATA = `${vless_url}`;
        }

        // 打印 log.txt 内容到控制台
        // console.log(Buffer.from(subTxt).toString('base64'));
        const filePath = path.join(FILE_PATH, 'log.txt');
        fs.writeFileSync(filePath, Buffer.from(subTxt).toString('base64'));

        previousArgoDomain = argoDomain; // Update the previous argoDomain
    } catch (error) {
        // console.error('Error:', error);
    }
}

// 上传函数
async function uploadSubscription(SUB_NAME, UPLOAD_DATA, SUB_URL) {
    const data = JSON.stringify({ URL_NAME: SUB_NAME, URL: UPLOAD_DATA });

    const options = {
        hostname: new URL(SUB_URL).hostname,
        port: 443, // Assuming HTTPS
        path: new URL(SUB_URL).pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(responseBody);
                } else {
                    reject(new Error(`Upload failed with status code: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

// 上传订阅
async function subupload() {
    await extractDomains();
    // console.log(UPLOAD_DATA);
    await uploadSubscription(SUB_NAME, UPLOAD_DATA, SUB_URL)
    .then((response) => {
        // console.log('Upload successful:', response);
    })
    .catch((error) => {
        // console.error('Upload failed:', error);
    });
}

// 1分钟后删除多余文件
function cleanfiles() {
    setTimeout(() => {
        const filesToDelete = [
            `${FILE_PATH}/bot`,
            `${FILE_PATH}/web`,
            `${FILE_PATH}/npm`,
            `${FILE_PATH}/config.yml`,
            `${FILE_PATH}/xconf`
        ];

        filesToDelete.forEach(filePath => {
            try {
                if (fs.existsSync(filePath)) {
                    if (fs.lstatSync(filePath).isDirectory()) {
                        fs.rmSync(filePath, { recursive: true }); // 递归删除目录
                    } else {
                        fs.unlinkSync(filePath);
                    }
                    // console.log(`${filePath} deleted`);
                }
            } catch (error) {
                // console.error(`Failed to delete ${filePath}: ${error}`);
            }
        });

        console.clear()
        console.log('App is running');
    }, 60000); // 60秒后
}

// 自动访问项目URL
async function visitProjectPage() {
    try {
        await axios.get(projectPageURL);
        // console.log(`Visiting project page: ${projectPageURL}`);
        console.log('Page visited successfully');
        // console.clear()
    } catch (error) {
        console.error('Error visiting project page:', error.message);
    }
}

// 主函数
async function main() {
    httpserver();
    createFolder(FILE_PATH);
    cleanupOldFiles();
    createFolder(path.join(FILE_PATH, 'xconf'));
    argoType();
    await downloadFiles();
    await delay(5000);
    await getipandisp();
    await myconfig();
    await runapp();
    await extractDomains();
    cleanfiles();
    if (SUB_URL) {
        if (ARGO_DOMAIN && ARGO_AUTH) {
            await subupload();
        } else {
            await setInterval(subupload, intervalInseconds * 1000);
            // await setInterval(subupload, 100000); // 100 秒
        }
    }
    if (projectPageURL) {
        await setInterval(visitProjectPage, intervalInseconds * 1000);
    }
}
main();
