import { createServer, IncomingMessage, ServerResponse } from "http"
import { IConcurrencyEvent, IDisableEvent, IEvent, IUpdateEvent } from "./src"
import { handle as cHandler } from "./src/create/handler"
import { handle as delHandler } from "./src/delete/handler"
import { handle as dHandler } from "./src/disable/handler"
import { handle as uHandler } from "./src/update/handler"
import { handle as uCodeHandler } from "./src/updateCode/handler"
import { log, error } from "./src/logger"

const PORT = 8009
const FUNCS = [
  { path: "/create", fn: (evt: IConcurrencyEvent) => cHandler(evt) },
  { path: "/update", fn: (evt: IUpdateEvent) => uHandler(evt) },
  { path: "/updateCode", fn: () => uCodeHandler() },
  { path: "/delete", fn: (evt: IEvent) => delHandler(evt) },
  { path: "/disable", fn: (evt: IDisableEvent) => dHandler(evt) },
]

const writeRes = (body: object, res: ServerResponse): void => {
  res.writeHead(200, { "Content-Type": "application/json" })
  res.write(JSON.stringify(body))
  res.end()
}

const requestHandler = async (
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> => {
  const url = req.url || "/"
  if (req.method === "POST") {
    let body = ""
    req.on("data", (data) => (body += data))
    req.on("end", async () => await handleReq(JSON.parse(body), url, res))
    return
  }

  return handleReq(
    {
      concurrency: { reserved: 3, post: 6 },
      consumerId: 456,
      consumerIds: [12345, 456],
    },
    url,
    res
  )
}

const handleReq = async (
  evt: IConcurrencyEvent | IUpdateEvent,
  url: string,
  res: ServerResponse
): Promise<void> => {
  try {
    if (url === "/") {
      return writeRes(
        {
          body: `Visit ${FUNCS.map((f) => f.path).join(
            ", "
          )} to invoke the corresponding Lambda function. POST an event or use the default specified in server.ts with a GET.`,
          event: evt,
          statusCode: 200,
        },
        res
      )
    }
    const func = FUNCS.find((f) => f.path === url)
    return writeRes(
      func
        ? await func.fn(evt as any)
        : { statusCode: 400, body: "Path not found." },
      res
    )
  } catch (e: any) {
    error("handle err", e)
    return writeRes({ statusCode: 500, body: e.message }, res)
  }
}

createServer(requestHandler).listen(PORT, () =>
  log(`Listening at localhost:${PORT}...`)
)
