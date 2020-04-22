const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')
const axios = require('axios')
const parser = require('xml2json');
const moment = require('moment')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)

global.io = io

const port = 5000

// izinkan Cors
app.use(cors()) 
// "cors" biar dapat melakukan post data dari front end
app.use((request, response, next) => {
    response.header('Access-Control-Allow-Origin', '*')
    response.header('Access-Control-Allow-Header', 'Origin, X-Requested-With, Content-Type, Accept')
    next();
})

// set bodyParser sebagai middleware yang akan memparsing body request
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

// connect ke database
mongoose.Promise = global.Promise
mongoose.connect('mongodb://localhost/server-tigasmos', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

const Route = express.Router()

var Schema = mongoose.Schema({
    date: Date,
    pasut_sensor_tekanan: Number,
    pasut_sensor_ultrasonik: Number
})
var notifSchema = mongoose.Schema({
    nama: String,
    date: String,
    ketinggian: Number,
    lokasi: String
})

const notif = mongoose.model('Notif', notifSchema)
const site1 = mongoose.model('Site-1', Schema)
const site2 = mongoose.model('Site-2', Schema)
const site3 = mongoose.model('Site-3', Schema)

// Get data site 1
const getsite_1 = (request, response) => {
    site1.find().exec((error, datas) => {
        if (error) {
            return response.json({
                'success': false,
                'message': 'Gagal mengambil datas!',
                error
            })
        }
        return response.json({
            'success': true,
            'message': 'Berhasil mengambil datas!',
            datas
        })
    })
}

// Get data site 2
const getsite_2 = (request, response) => {
    site2.find().exec((error, datas) => {
        if (error) {
            return response.json({
                'success': false,
                'message': 'Gagal mengambil datas!',
                error
            })
        }
        return response.json({
            'success': true,
            'message': 'Berhasil mengambil datas!',
            datas
        })
    })
}

// get data site 3
const getsite_3 = (request, response) => {
    site3.find().exec((error, datas) => {
        if (error) {
            return response.json({
                'success': false,
                'message': 'Gagal mengambil datas!',
                error
            })
        }
        return response.json({
            'success': true,
            'message': 'Berhasil mengambil datas!',
            datas
        })
    })
}

// Get data notif
const getnotif = (request, response) => {
    notif.find().exec((error, datas) => {
        if (error) {
            return response.json({
                'success': false,
                'message': 'Gagal mengambil datas!',
                error
            })
        }
        return response.json({
            'success': true,
            'message': 'Berhasil mengambil datas!',
            datas
        })
    })
}

// ------- Add Data ---------

// add data potesial tsunami

// --------------- Area Percobaan -------------
let status, oldDate, dateNow, datePotensi, newPasut, oldPasut

// Koordinate lokasi Site Tigasmos
//  site 1
const site1Lat = -6.481760
const site1Lon = 105.669444
// site 2
const site2Lat = -5.916742
const site2Lon = 106.027434
// site 3
const site3Lat = -6.085411
const site3Lon = 106.727449


const addsite_1 = (request, response) => {
    const newData = new site1(request.body)

    // --------
    async function main() {
        var tanggal
        let siteLatUp = site1Lat + 5
        let siteLatDown = site1Lat - 5
        let siteLonUp = site1Lon + 5
        let siteLonDown = site1Lon - 5
        let rangeLat, rangeLon, latPot, lonPot
        await axios.get("https://data.bmkg.go.id/lasttsunami.xml")
            .then(respon => {
                var json = parser.toJson(respon.data)
                var obj = JSON.parse(json)
                tanggal = obj.Infotsunami.Gempa.Tanggal
                latPot = obj.Infotsunami.Gempa.Lintang
                lonPot = obj.Infotsunami.Gempa.Bujur
                // tesing uncomment kode dibawah ini
                // latPot = -6.481760
                // lonPot = 105.669444
            })

        // ------------------------ PENTING --------------------------
        // untuk pengujian mengeluarkan nilai konfirmasi kedatangan 
        // lokasi masuk +- 5 dari lokasi tide gauge
        // ex:
        // latPot = -6.481760
        // lonPot = 105.669444
        // 
        // untuk uji notifikasi ganti dateNow dan yang dikirim oleh site tigasmos tanggal yang sama
        // ex:
        // dateNow = 14-Nov-19
        // dan post data dari site ex:
        //  awal pengiriman
        // {
        //     "pasut_sensor_tekanan":1,
        //     "pasut_sensor_ultrasonik":1,
        //     "date":"2019-11-14T17:11:47.000+07:00"
        // }
        // pengiriman ke 2
        // {
        //     "pasut_sensor_tekanan":2,
        //     "pasut_sensor_ultrasonik":2,
        //     "date":"2019-11-14T17:11:47.000+07:00"
        // }
        //  nilai pasut harus berambah >= 0.5 m

        // ------------------------ PENTING --------------------------

        newPasut = newData.pasut_sensor_ultrasonik
        dateNow = moment().format('DD-MMM-YY')
        // tesing uncomment kode dibawah
        // dateNow = "14-Nov-19"
        // ---------------
        datePotensi = tanggal

        // Filter Lokasi | bila lokasi +- 5 dari lat dan lon
        if (latPot > siteLatDown && latPot < siteLatUp) {
            rangeLat = true
        } else {
            rangeLat = false
        }

        if (lonPot > siteLonDown && lonPot < siteLonUp) {
            rangeLon = true
        } else {
            rangeLon = false
        }

        let hasil = newPasut - oldPasut
        if (oldDate != datePotensi) {
            status = 0
        }

        if (dateNow == datePotensi && status == 0 && rangeLon && rangeLat) {
            if (hasil >= 0.5) {
                console.log('Konfirmasi kedatangan tsunami')
                var notifikasi = {
                    'nama': 'site 1',
                    'date': moment().format(),
                    'ketinggian': hasil,
                    'lokasi': `${site1Lat}, ${site1Lon}`
                }
                const newNotifikasi = new notif(notifikasi)
                newNotifikasi.save()
                global.io.emit('notif', notifikasi)
                status = 1
                oldDate = datePotensi
            }
        }
        // console.log('old pasut : ' + oldPasut + ' | new pasut : ' + newPasut + ' | old date : ' + oldDate + ' | date pot : ' + datePotensi + ' | hasil : ' + hasil)
        oldPasut = newPasut
    }
    main()
    // handle post response
    newData.save((error, data) => {
        global.io.emit('site1', data)
        if (error) {
            return response.json({
                'success': false,
                'message': 'Gagal menambah data!',
                error
            })
        }
        return response.json({
            'success': true,
            'message': 'Berhasil Menambahkan data',
            data
        })
    })
}

// Add data site 2
const addsite_2 = (request, response) => {
    const newData = new site2(request.body)

    async function main() {
        var tanggal
        let siteLatUp = site2Lat + 5
        let siteLatDown = site2Lat - 5
        let siteLonUp = site2Lon + 5
        let siteLonDown = site2Lon - 5
        let rangeLat, rangeLon, latPot, lonPot
        await axios.get("https://data.bmkg.go.id/lasttsunami.xml")
            .then(respon => {
                var json = parser.toJson(respon.data)
                var obj = JSON.parse(json)
                tanggal = obj.Infotsunami.Gempa.Tanggal
                latPot = obj.Infotsunami.Gempa.Lintang
                lonPot = obj.Infotsunami.Gempa.Bujur
                // tesing uncomment kode dibawah ini
                // latPot = -6.481760
                // lonPot = 105.669444
            })

        // ------------------------ PENTING --------------------------
        // untuk pengujian mengeluarkan nilai konfirmasi kedatangan 
        // lokasi masuk +- 5 dari lokasi tide gauge
        // ex:
        // latPot = -6.481760
        // lonPot = 105.669444
        // 
        // untuk uji notifikasi ganti dateNow dan yang dikirim oleh site tigasmos tanggal yang sama
        // ex:
        // dateNow = 14-Nov-19
        // dan post data dari site ex:
        //  awal pengiriman
        // {
        //     "pasut_sensor_tekanan":1,
        //     "pasut_sensor_ultrasonik":1,
        //     "date":"2019-11-14T17:11:47.000+07:00"
        // }
        // pengiriman ke 2
        // {
        //     "pasut_sensor_tekanan":2,
        //     "pasut_sensor_ultrasonik":2,
        //     "date":"2019-11-14T17:11:47.000+07:00"
        // }
        //  nilai pasut harus berambah >= 0.5 m

        // ------------------------ PENTING --------------------------

        newPasut = newData.pasut_sensor_ultrasonik
        dateNow = moment().format('DD-MMM-YY')
        // tesing uncomment kode dibawah
        // dateNow = "14-Nov-19"
        // ---------------
        datePotensi = tanggal

        // Filter Lokasi | bila lokasi +- 5 dari lat dan lon
        if (latPot > siteLatDown && latPot < siteLatUp) {
            rangeLat = true
        } else {
            rangeLat = false
        }

        if (lonPot > siteLonDown && lonPot < siteLonUp) {
            rangeLon = true
        } else {
            rangeLon = false
        }

        let hasil = newPasut - oldPasut
        if (oldDate != datePotensi) {
            status = 0
        }

        if (dateNow == datePotensi && status == 0 && rangeLon && rangeLat) {
            if (hasil >= 0.5) {
                console.log('Konfirmasi kedatangan tsunami')
                var notifikasi = {
                    'nama': 'site 2',
                    'date': moment().format(),
                    'ketinggian': hasil,
                    'lokasi': `${site2Lat}, ${site2Lon}`
                }
                const newNotifikasi = new notif(notifikasi)
                newNotifikasi.save()
                global.io.emit('notif', notifikasi)
                status = 1
                oldDate = datePotensi
            }
        }
        // console.log('old pasut : ' + oldPasut + ' | new pasut : ' + newPasut + ' | old date : ' + oldDate + ' | date pot : ' + datePotensi + ' | hasil : ' + hasil)
        oldPasut = newPasut
    }
    main()
    // handle post response

    newData.save((error, data) => {
        global.io.emit('site2', data)
        if (error) {
            return response.json({
                'success': false,
                'message': 'Gagal menambah data!',
                error
            })
        }
        return response.json({
            'success': true,
            'message': 'Berhasil Menambahkan data',
            data
        })
    })
}

// Add data site 3
const addsite_3 = (request, response) => {
    const newData = new site3(request.body)

    async function main() {
        var tanggal
        let siteLatUp = site3Lat + 5
        let siteLatDown = site3Lat - 5
        let siteLonUp = site3Lon + 5
        let siteLonDown = site3Lon - 5
        let rangeLat, rangeLon, latPot, lonPot
        await axios.get("https://data.bmkg.go.id/lasttsunami.xml")
            .then(respon => {
                var json = parser.toJson(respon.data)
                var obj = JSON.parse(json)
                tanggal = obj.Infotsunami.Gempa.Tanggal
                latPot = obj.Infotsunami.Gempa.Lintang
                lonPot = obj.Infotsunami.Gempa.Bujur
                // tesing uncomment kode dibawah ini
                // latPot = -6.481760
                // lonPot = 105.669444
            })

        // ------------------------ PENTING --------------------------
        // untuk pengujian mengeluarkan nilai konfirmasi kedatangan 
        // lokasi masuk +- 5 dari lokasi tide gauge
        // ex:
        // latPot = -6.481760
        // lonPot = 105.669444
        // 
        // untuk uji notifikasi ganti dateNow dan yang dikirim oleh site tigasmos tanggal yang sama
        // ex:
        // dateNow = 14-Nov-19
        // dan post data dari site ex:
        //  awal pengiriman
        // {
        //     "pasut_sensor_tekanan":1,
        //     "pasut_sensor_ultrasonik":1,
        //     "date":"2019-11-14T17:11:47.000+07:00"
        // }
        // pengiriman ke 2
        // {
        //     "pasut_sensor_tekanan":2,
        //     "pasut_sensor_ultrasonik":2,
        //     "date":"2019-11-14T17:11:47.000+07:00"
        // }
        //  nilai pasut harus berambah >= 0.5 m

        // ------------------------ PENTING --------------------------

        newPasut = newData.pasut_sensor_ultrasonik
        dateNow = moment().format('DD-MMM-YY')
        // tesing uncomment kode dibawah
        // dateNow = "14-Nov-19"
        // ---------------
        datePotensi = tanggal

        // Filter Lokasi | bila lokasi +- 5 dari lat dan lon
        if (latPot > siteLatDown && latPot < siteLatUp) {
            rangeLat = true
        } else {
            rangeLat = false
        }

        if (lonPot > siteLonDown && lonPot < siteLonUp) {
            rangeLon = true
        } else {
            rangeLon = false
        }

        let hasil = newPasut - oldPasut
        if (oldDate != datePotensi) {
            status = 0
        }

        if (dateNow == datePotensi && status == 0 && rangeLon && rangeLat) {
            if (hasil >= 0.5) {
                console.log('Konfirmasi kedatangan tsunami')
                var notifikasi = {
                    'nama': 'site 3',
                    'date': moment().format(),
                    'ketinggian': hasil,
                    'lokasi': `${site3Lat}, ${site3Lon}`
                }
                const newNotifikasi = new notif(notifikasi)
                newNotifikasi.save()
                global.io.emit('notif', notifikasi)
                status = 1
                oldDate = datePotensi
            }
        }
        // console.log('old pasut : ' + oldPasut + ' | new pasut : ' + newPasut + ' | old date : ' + oldDate + ' | date pot : ' + datePotensi + ' | hasil : ' + hasil)
        oldPasut = newPasut
    }
    main()
    // handle post response

    newData.save((error, data) => {
        global.io.emit('site3', data)
        if (error) {
            return response.json({
                'success': false,
                'message': 'Gagal menambah data!',
                error
            })
        }
        return response.json({
            'success': true,
            'message': 'Berhasil Menambahkan data',
            data
        })
    })
}



Route.route('/notif')
    .get(getnotif)

Route.route('/site-1')
    .get(getsite_1)
    .post(addsite_1)

Route.route('/site-2')
    .get(getsite_2)
    .post(addsite_2)

Route.route('/site-3')
    .get(getsite_3)
    .post(addsite_3)

// set route
app.use('/api', Route)
app.get('/', (request, response) => {
    return response.end('Api Working')
})

server.listen(port, () => {
    console.log(`berjalan di port ${port}`)
})