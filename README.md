# MMM-BluetoothDevices

*This package is still in testing/beta* 

Written in Javascript and utilizes the BlueZ Linux Bluetooth stack via its native D-Bus interface.

## Supported devices
| Device                    | Screenshot                                      |
| ---                       | ---                                             |
| Oral-B Smart Toothbrushes | ![Screenshot](/screenshots/oralbtoothbrush.png) |

## How it works
When running magic mirror and you open the web interface, if not already, the node_helper will start connecting and listening to your configured bluetooth device(s).

## Installation

### Config file
To run own services (GATT) we need to permission to start a service on the system D-Bus.

Copy and move the `setup/MMM.conf` into the following directory: `/etc/dbus-1/system.d/`.

*In the file the users `pi` and `root` are granted permission.*

### Docker
If your running MagicMirror in [docker](https://docs.magicmirror.builders/getting-started/installation.html#docker-image) you need to add the following volume mounts:
- /var/run/dbus/system_bus_socket:/var/run/dbus/system_bus_socket
- /etc/dbus-1/system.d/toothbrush.conf:/etc/dbus-1/system.d/toothbrush.conf

## Configuration

| Key                       | Type   | Default                          | Description                                                   |
| ---                       | ---    | ---                              | ---                                                           |
| name                      | String | `raspberrypi`                    | the name for the running bluetooth adapter                    |
| mode                      | String | `le`                             |                                                               |
| hci                       | String | `hci0`                           | which hci port to take for the bluetooth adapter              |
| interfaceName             | String | `org.bluez.Adapter1`             | the bluetooth adapter name to take                            |
| services                  | Array  | `{ type: 'CurrentTimeService' }` | bluetooth GATT services                                       |
| services.type             | String |                                  | the service name, see [services](#services)                   |
| devices                   | Array  | `[]`                             | the bluetooth devices                                         |
| devices[].type            | String |                                  | the device name, see [devices](#devices)                      |
| devices[].name            | String |                                  | the name for the devices, can be used in `layout.data.fields` |
| devices[].mac             | String |                                  | the device bluetooth mac                                      |
| layout                    | Object |                                  |                                                               |
| layout.title              | Object |                                  |                                                               |
| layout.title.position     | String | `bottom`                         | either `top` or `bottom`                                      |
| layout.title.key          | String | `name`                           | the key of the device data to show                            |
| layout.data               | Object |                                  |                                                               |
| layout.data.position      | String | `bottom`                         | either `top` or `bottom`                                      |
| layout.data.fields        | Array  | `{ key: 'mode', text: 'mode' }`  |                                                               |
| layout.data.fields[].key  | String |                                  | the label                                                     |
| layout.data.fields[].text | String |                                  | the key of the device data to show                            |

### Example
```json
{
  "module": "MMM-BluetoothDevices",
  "position": "top_bar",
  "config": {
    "devices": [
      { "type": "OralBToothbrush", "name": "oralb", "mac": "XX:XX:XX:XX:XX:XX" }
    ]
  }
}
```

### Devices
 - OralBToothbrush
 
### Device data

### Oral-B Toothbrush
| Key      | Type   |
| ---      | ---    |
| state    | String |
| pressure | String |
| time     | Int    |
| mode     | String |
| sector   | String |

### Services
 - CurrentTimeService

## Development
I tried to make this package as generic as possible to allow support for more devices.
If you have any tips/suggestions or want to create support for a new bluetooth device let me know.
 
## Credits
Credits to [Hypfer/Cybele](https://github.com/Hypfer/Cybele) I used this package to see how to make connection with bluetooth devices.

