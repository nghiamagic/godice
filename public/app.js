

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

let device = null
let server = null

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

/* touch */

document.addEventListener(
  'touchstart',
  wakeScreen
)

document.addEventListener(
  'touchend',
  sleepScreen
)

/* mouse */

document.addEventListener(
  'mousedown',
  wakeScreen
)

document.addEventListener(
  'mouseup',
  sleepScreen
)

/* exit sleep mode with 2 fingers */

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

    log('Searching GoDice...')

    device =
      await navigator.bluetooth.requestDevice({

        filters:[
          {
            namePrefix:'GoDice'
          }
        ],

        optionalServices:[
          'battery_service'
        ]

      })

    deviceNameEl.innerText =
      device.name || 'Unknown'

    device.addEventListener(
      'gattserverdisconnected',
      onDisconnected
    )

    await connectGATT()

  }catch(e){

    log('ERROR: ' + e.message)
  }
}

async function connectGATT(){

  try{

    server =
      await device.gatt.connect()

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

    if(
      device &&
      device.gatt.connected
    ){

      device.gatt.disconnect()

      log('Disconnected manually')
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

      log('Reconnect success')

      return

    }catch(e){

      log('Reconnect failed')

      await delay(3000)
    }
  }
}

async function readBattery(){

  try{

    const service =
      await server.getPrimaryService(
        'battery_service'
      )

    const characteristic =
      await service.getCharacteristic(
        'battery_level'
      )

    const value =
      await characteristic.readValue()

    const battery =
      value.getUint8(0)

    batteryEl.innerText =
      battery + '%'

    log(
      'Battery: ' +
      battery + '%'
    )

  }catch(e){

    log('Battery unavailable')
  }
}

async function setupNotifications(){

  const services =
    await server.getPrimaryServices()

  for(const service of services){

    log(
      'SERVICE: ' +
      service.uuid
    )

    let characteristics = []

    try{

      characteristics =
        await service.getCharacteristics()

    }catch(e){

      log(
        'Cannot read characteristics'
      )

      continue
    }

    for(const ch of characteristics){

      if(!ch) continue

      log(
        'CHAR: ' + ch.uuid
      )

      // WebBLE fix
      if(
        !ch.properties
      ){
        continue
      }

      if(
        ch.properties.notify === true ||
        ch.properties.indicate === true
      ){

        try{

          await ch.startNotifications()

          ch.addEventListener(
            'characteristicvaluechanged',
            handleNotification
          )

          log(
            'Notify enabled'
          )

        }catch(e){

          log(
            'Notify fail: ' +
            e.message
          )
        }
      }
    }
  }
}

function handleNotification(event){

  const value =
    event.target.value

  const data =
    [...new Uint8Array(
      value.buffer
    )]

  log(
    'DATA: ' +
    JSON.stringify(data)
  )

  parseDicePacket(data)
}

function parseDicePacket(data){

  // ===== ROLLING =====
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

  // invalid packet
  if(data.length < 4) return

  setStatus(
    'Stable',
    'connected'
  )

  let x, y, z

  // packet 5 byte
  if(data.length >= 5){

    x = data[2]
    y = data[3]
    z = data[4]
  }

  // packet 4 byte
  else{

    x = data[1]
    y = data[2]
    z = data[3]
  }

  let face = null

  // ===== FACE 1 =====
if(
  x >= 189 && x <= 195 &&
  (
    y >= 248 ||
    y <= 3
  )
){
  face = 1
}

// ===== FACE 2 =====
else if(
  (
    y >= 248 ||
    y <= 3
  ) &&
  z >= 61 && z <= 63
){
  face = 2
}

// ===== FACE 3 =====
else if(
  y >= 57 && y <= 66 &&
  (
    z >= 248 ||
    z <= 4
  )
){
  face = 3
}

// ===== FACE 4 =====
else if(
  y >= 186 && y <= 195
){
  face = 4
}

// ===== FACE 5 =====
else if(
  (
    y >= 248 ||
    y <= 4
  ) &&
  z >= 186 && z <= 195
){
  face = 5
}

// ===== FACE 6 =====
else if(
  x >= 62 && x <= 66 &&
z >= 0 && z <= 255
){
  face = 6
}

  // ===== UPDATE UI =====
  if(face){
window.set(
    window.ref(window.db, 'dice'),
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

  // ===== BATTERY =====
  const battery =
    data.find(v =>
      v >= 10 &&
      v <= 100
    )

  if(battery){

    batteryEl.innerText =
      battery + '%'
  }
}

function delay(ms){

  return new Promise(resolve =>
    setTimeout(resolve, ms)
  )
}

if(
  'serviceWorker' in navigator
){

  navigator.serviceWorker
    .register('./sw.js')
    .then(() => {

      log(
        'Service Worker Ready'
      )

    })
    .catch(() => {

      log(
        'SW registration fail'
      )
    })
}

