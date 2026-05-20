import { BleClient } from '@capacitor-community/bluetooth-le'

const connectBtn =
  document.getElementById('connectBtn')

const disconnectBtn =
  document.getElementById('disconnectBtn')

const sleepBtn =
  document.getElementById('sleepBtn')

const logEl =
  document.getElementById('log')

const statusEl =
  document.getElementById('status')

const diceEl =
  document.getElementById('dice')

const batteryEl =
  document.getElementById('battery')

const deviceNameEl =
  document.getElementById('deviceName')

const faceValueEl =
  document.getElementById('faceValue')

const orientationEl =
  document.getElementById('orientation')

const faces = {
  1:'⚀',
  2:'⚁',
  3:'⚂',
  4:'⚃',
  5:'⚄',
  6:'⚅'
}

let deviceId = null
let reconnecting = false

let lastFace = null
let lastFaceTime = 0

let sleepMode = false

function log(msg){

  console.log(msg)

  const time =
    new Date().toLocaleTimeString()

  logEl.innerHTML +=
    '[' + time + '] ' + msg + '\n'

  logEl.scrollTop =
    logEl.scrollHeight
}

function setStatus(text, cls){

  statusEl.innerText = text

  statusEl.className =
    'status ' + cls
}

/* ===== SLEEP MODE ===== */

sleepBtn.onclick = () => {

  sleepMode = true

  document.body.classList.add(
    'sleep'
  )
}

function wakeScreen(){

  if(!sleepMode) return

  document.body.classList.remove(
    'sleep'
  )

  document.body.classList.add(
    'awake'
  )
}

function sleepScreen(){

  if(!sleepMode) return

  document.body.classList.remove(
    'awake'
  )

  document.body.classList.add(
    'sleep'
  )
}

document.addEventListener(
  'touchstart',
  wakeScreen
)

document.addEventListener(
  'touchend',
  sleepScreen
)

document.addEventListener(
  'mousedown',
  wakeScreen
)

document.addEventListener(
  'mouseup',
  sleepScreen
)

document.addEventListener(
  'touchmove',
  e => {

    if(e.touches.length >= 2){

      sleepMode = false

      document.body.classList.remove(
        'sleep'
      )

      document.body.classList.remove(
        'awake'
      )
    }
  }
)

connectBtn.onclick = connect
disconnectBtn.onclick = disconnect

async function connect(){

  try{

    log('Initializing BLE...')

    await BleClient.initialize()

    log('Scanning GoDice...')

    const device =
      await BleClient.requestDevice({

        namePrefix: 'GoDice',

        optionalServices: [
          'battery_service'
        ]
      })

    deviceId = device.deviceId

    deviceNameEl.innerText =
      device.name || 'GoDice'

    log(
      'Found: ' +
      device.name
    )

    await connectGATT()

  }catch(e){

    log(
      'ERROR: ' +
      e.message
    )
  }
}

async function connectGATT(){

  try{

    await BleClient.connect(
      deviceId,
      onDisconnected
    )

    log('Connected')

    setStatus(
      'Connected',
      'connected'
    )

    await readBattery()

    await setupNotifications()

  }catch(e){

    log(
      'Connect fail: ' +
      e.message
    )
  }
}

async function disconnect(){

  try{

    reconnecting = false

    if(deviceId){

      await BleClient.disconnect(
        deviceId
      )

      log(
        'Disconnected manually'
      )
    }

  }catch(e){

    log(e.message)
  }
}

function onDisconnected(){

  setStatus(
    'Disconnected',
    'disconnected'
  )

  log('Disconnected')

  autoReconnect()
}

async function autoReconnect(){

  if(reconnecting) return

  reconnecting = true

  while(true){

    try{

      log('Reconnecting...')

      await connectGATT()

      reconnecting = false

      log(
        'Reconnect success'
      )

      return

    }catch(e){

      log(
        'Reconnect failed'
      )

      await delay(3000)
    }
  }
}

async function readBattery(){

  try{

    const value =
      await BleClient.read(

        deviceId,

        '180F',

        '2A19'
      )

    const battery =
      new Uint8Array(value)[0]

    batteryEl.innerText =
      battery + '%'

    log(
      'Battery: ' +
      battery + '%'
    )

  }catch(e){

    log(
      'Battery unavailable'
    )
  }
}

async function setupNotifications(){

  try{

    const services =
      await BleClient.getServices(
        deviceId
      )

    for(const service of services){

      log(
        'SERVICE: ' +
        service.uuid
      )

      if(
        !service.characteristics
      ){
        continue
      }

      for(
        const ch
        of service.characteristics
      ){

        log(
          'CHAR: ' +
          ch.uuid
        )

        if(
          ch.properties.notify
        ){

          try{

            await BleClient.startNotifications(

              deviceId,

              service.uuid,

              ch.uuid,

              value => {

                const data =
                  [...new Uint8Array(value)]

                log(
                  'DATA: ' +
                  JSON.stringify(data)
                )

                parseDicePacket(data)
              }
            )

            log(
              'Notify enabled'
            )

          }catch(e){

            log(
              'Notify fail'
            )
          }
        }
      }
    }

  }catch(e){

    log(
      'Notify setup fail: ' +
      e.message
    )
  }
}

function parseDicePacket(data){

  if(
    data.length === 1 &&
    data[0] === 82
  ){

    setStatus(
      'Rolling...',
      'rolling'
    )

    return
  }

  if(data.length < 4) return

  setStatus(
    'Stable',
    'connected'
  )

  let x, y, z

  if(data.length >= 5){

    x = data[2]
    y = data[3]
    z = data[4]
  }

  else{

    x = data[1]
    y = data[2]
    z = data[3]
  }

  let face = null

  if(
    x >= 189 && x <= 195 &&
    (
      y >= 248 ||
      y <= 3
    )
  ){
    face = 1
  }

  else if(
    (
      y >= 248 ||
      y <= 3
    ) &&
    z >= 61 && z <= 63
  ){
    face = 2
  }

  else if(
    y >= 57 && y <= 66 &&
    (
      z >= 248 ||
      z <= 4
    )
  ){
    face = 3
  }

  else if(
    y >= 186 && y <= 195
  ){
    face = 4
  }

  else if(
    (
      y >= 248 ||
      y <= 4
    ) &&
    z >= 186 && z <= 195
  ){
    face = 5
  }

  else if(
    x >= 62 && x <= 66
  ){
    face = 6
  }

  if(face){

    window.set(
      window.ref(
        window.db,
        'dice'
      ),
      {
        face: face,
        time: Date.now()
      }
    )

    wakeScreen()

    const now = Date.now()

    if(
      face !== lastFace ||
      now - lastFaceTime > 300
    ){

      lastFace = face
      lastFaceTime = now

      diceEl.innerText =
        faces[face]

      faceValueEl.innerText =
        face

      orientationEl.innerText =
        'Top Face ' + face

      log(
        'FACE: ' + face
      )
    }
  }
}

function delay(ms){

  return new Promise(resolve =>
    setTimeout(resolve, ms)
  )
}