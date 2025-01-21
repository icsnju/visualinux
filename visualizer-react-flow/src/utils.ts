// time

export function getTimeText(timestamp: number) {
    const time = new Date(timestamp);
    return `${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`;
}

// commonly used log repr

export type LogEntry = {
    timestamp: number
    type: LogType
    message: string
}
export type LogType = 'info' | 'warning' | 'error'

export function addLogTo(logs: LogEntry[], type: LogType, message: string) {
    const log: LogEntry = {
        timestamp: Date.now(),
        type: type,
        message: message
    };
    logs.push(log);
    const time = getTimeText(log.timestamp);
    const logger = log.type === 'error' ? console.error : log.type === 'warning' ? console.warn : console.log;
    logger(`[${time}:${log.type}]`, log.message);
}
