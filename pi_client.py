import socketio
import time
import json

# Initialize Socket.io client with explicit reconnection settings
sio = socketio.Client(
    reconnection=True,
    reconnection_attempts=0, # Infinite retries
    reconnection_delay=1,
    reconnection_delay_max=10,
    logger=False,
    engineio_logger=False
)

# The URL of your web app
APP_URL = "https://ais-dev-w425vnzhtll24accgzzn22-533471323411.asia-east1.run.app"

@sio.event
def connect():
    print("--- INDUSTRIAL SYSTEM ONLINE ---")
    print(f"Connected to: {APP_URL}")
    sio.emit('register_pi')

@sio.event
def disconnect():
    print("--- SYSTEM OFFLINE ---")

@sio.on('motor_state_update')
def on_motor_state_update(data):
    status = data.get('status')
    rpm = data.get('actualRPM')
    temp = data.get('temperature')
    line = data.get('line')
    
    # Single Phase Monitoring
    print(f"\r[STATUS: {status}] RPM: {rpm:4.0f} | TEMP: {temp:4.1f}°C | LINE: {line['voltage']:3.0f}V {line['current']:4.1f}A", end="")
    
    if status == "ESTOP":
        print("\n!!! EMERGENCY STOP ACTIVATED !!!")
        # Hard stop all GPIO outputs immediately
    elif status == "FAULT":
        print(f"\n!!! SYSTEM FAULT: {data.get('faultCode')} !!!")

@sio.event
def connect_error(data):
    print("Connection failed. Retrying...")

if __name__ == '__main__':
    while True:
        try:
            if not sio.connected:
                print(f"Attempting to connect to: {APP_URL}")
                sio.connect(APP_URL, wait_timeout=10)
                sio.wait()
        except Exception as e:
            print(f"\nConnection error: {e}")
            print("Retrying in 5 seconds...")
            time.sleep(5)
        except KeyboardInterrupt:
            print("\nShutting down Pi client...")
            if sio.connected:
                sio.disconnect()
            break
