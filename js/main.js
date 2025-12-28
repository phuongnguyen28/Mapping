// Khởi tạo bản đồ
const map = L.map('map', {
    zoomControl: false, // Ẩn zoom control mặc định
    tap: true // Hỗ trợ touch trên mobile
}).setView([16.0, 108.0], 6);

// Thêm zoom control ở góc phải
L.control.zoom({
    position: 'topright'
}).addTo(map);

// Tile layer (nền bản đồ)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
    minZoom: 5
}).addTo(map);

// Biến lưu trữ các layer
let provinceLayer = null;
let districtLayer = null;
let communeLayer = null;
let roadLayer = null;
let markersLayers = {}; // Lưu layer theo từng icon
let userLocationMarker = null;
let userLocationCircle = null;

// Khởi tạo layers cho các biểu tượng
const iconTypes = ['restaurant', 'home', 'store'];
iconTypes.forEach(iconType => {
    markersLayers[iconType] = L.layerGroup().addTo(map);
});

// Biến cho chế độ thêm marker
let isAddingMarker = false;
let tempMarkerPos = null;

// Lưu trữ markers (sẽ được tải từ Firestore)
let savedMarkers = [];
let isFirestoreReady = false;

// Màu sắc cho các cấp
const colors = {
    province: '#3498db',
    district: '#e74c3c',
    commune: '#2ecc71',
    road: '#7f8c8d'
};

// Dữ liệu đã tải và chỉ mục tìm kiếm
let provincesData = null;
let districtsData = null;
let roadsData = null;
let searchIndex = [];

// Trạng thái lọc cho danh sách mốc
let markerFilterText = '';
let markerFilterColor = 'all';

// Tải dữ liệu GeoJSON và hiển thị
async function loadGeoJSONData() {
    try {
        // Tỉnh/Thành phố
        const provinceRes = await fetch('data/provinces.geojson');
        const provinces = await provinceRes.json();
        provincesData = provinces;

        // Thêm vào chỉ mục tìm kiếm
        provinces.features.forEach(f => {
            searchIndex.push({
                type: 'province',
                name: (f.properties.name || '').toLowerCase(),
                displayName: f.properties.name,
                feature: f
            });
        });

        provinceLayer = L.geoJSON(provinces, {
            style: {
                color: colors.province,
                weight: 2,
                opacity: 0.6,
                fillOpacity: 0.1
            },
            onEachFeature: function (feature, layer) {
                // Thêm tooltip
                layer.bindTooltip(feature.properties.name, {
                    permanent: false,
                    direction: 'center',
                    className: 'province-tooltip'
                });

                // Click event
                layer.on('click', function (e) {
                    showAreaInfo({
                        type: 'Tỉnh/Thành phố',
                        name: feature.properties.name,
                        code: feature.properties.code
                    });
                });
            }
        }).addTo(map);

        // Quận/Huyện
        const districtRes = await fetch('data/districts.geojson');
        const districts = await districtRes.json();
        districtsData = districts;

        // Thêm vào chỉ mục tìm kiếm
        districts.features.forEach(f => {
            searchIndex.push({
                type: 'district',
                name: (f.properties.name || '').toLowerCase(),
                displayName: f.properties.name,
                provinceName: f.properties.province_name,
                feature: f
            });
        });

        districtLayer = L.geoJSON(districts, {
            style: {
                color: colors.district,
                weight: 1,
                opacity: 0.5,
                fillOpacity: 0.05
            },
            onEachFeature: function (feature, layer) {
                layer.bindTooltip(feature.properties.name, {
                    permanent: false,
                    direction: 'center',
                    className: 'district-tooltip'
                });

                layer.on('click', function (e) {
                    showAreaInfo({
                        type: 'Quận/Huyện',
                        name: feature.properties.name,
                        province: feature.properties.province_name
                    });
                });
            }
        }).addTo(map);

        // Đường (sử dụng boundary canvas cho hiệu năng)
        const roadRes = await fetch('data/roads.geojson');
        const roads = await roadRes.json();
        roadsData = roads;

        // Thêm vào chỉ mục tìm kiếm (chỉ những đường có tên)
        roads.features.forEach(f => {
            if (f.properties && f.properties.name) {
                searchIndex.push({
                    type: 'road',
                    name: (f.properties.name || '').toLowerCase(),
                    displayName: f.properties.name,
                    feature: f
                });
            }
        });

        roadLayer = L.geoJSON(roads, {
            style: {
                color: colors.road,
                weight: 1,
                opacity: 0.7
            },
            onEachFeature: function (feature, layer) {
                // Thêm label cho đường chính
                if (feature.properties.highway === 'primary' ||
                    feature.properties.highway === 'secondary') {
                    const center = layer.getBounds().getCenter();
                    L.marker(center, {
                        icon: L.divIcon({
                            className: 'road-label',
                            html: feature.properties.name || 'Đường',
                            iconSize: [100, 20]
                        })
                    }).addTo(map);
                }
            }
        }).addTo(map);

    } catch (error) {
        console.error('Lỗi tải dữ liệu:', error);
    }
}

// Hiển thị thông tin khu vực
function showAreaInfo(info) {
    const infoDiv = document.getElementById('area-info');
    infoDiv.innerHTML = `
        <h4>${info.type}</h4>
        <p><strong>Tên:</strong> ${info.name}</p>
        ${info.code ? `<p><strong>Mã:</strong> ${info.code}</p>` : ''}
        ${info.province ? `<p><strong>Thuộc tỉnh:</strong> ${info.province}</p>` : ''}
        <p><em>Click vào khu vực khác để xem thông tin</em></p>
    `;
}

// Control layer visibility
// Commented out - checkboxes removed from UI but layers still visible
/*
document.getElementById('province-layer').addEventListener('change', function (e) {
    if (provinceLayer) {
        if (e.target.checked) {
            map.addLayer(provinceLayer);
        } else {
            map.removeLayer(provinceLayer);
        }
    }
});

document.getElementById('district-layer').addEventListener('change', function (e) {
    if (districtLayer) {
        if (e.target.checked) {
            map.addLayer(districtLayer);
        } else {
            map.removeLayer(districtLayer);
        }
    }
});

document.getElementById('road-layer').addEventListener('change', function (e) {
    if (roadLayer) {
        if (e.target.checked) {
            map.addLayer(roadLayer);
        } else {
            map.removeLayer(roadLayer);
        }
    }
});
*/

// Tìm kiếm
document.getElementById('search-btn').addEventListener('click', performSearch);
document.getElementById('search-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') performSearch();
});

function createSearchResultsContainer() {
    if (document.getElementById('search-results')) return;
    const container = document.createElement('div');
    container.id = 'search-results';
    container.style.cssText = `
        position: absolute;
        top: 64px;
        left: 16px;
        right: 16px;
        max-height: 300px;
        overflow-y: auto;
        z-index: 3000;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: none;
    `;
    const controls = document.getElementById('controls-panel') || document.body;
    if (controls.parentNode) {
        controls.parentNode.insertBefore(container, controls.nextSibling);
    } else {
        document.body.appendChild(container);
    }
}

async function performSearch() {
    const queryRaw = document.getElementById('search-input').value.trim();
    if (!queryRaw) {
        showToast('Vui lòng nhập từ khoá tìm kiếm');
        return;
    }

    createSearchResultsContainer();
    const container = document.getElementById('search-results');
    container.innerHTML = '<div style="padding:12px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Đang tìm kiếm...</div>';
    container.style.display = 'block';

    const query = queryRaw.toLowerCase();

    // 1. Tìm kiếm trong dữ liệu local
    const localResults = searchIndex.filter(item => item.name.includes(query));

    // 2. Tìm kiếm qua Nominatim API (OpenStreetMap)
    let onlineResults = [];
    try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryRaw)}&countrycodes=vn&limit=10&addressdetails=1`;
        const response = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'VietnamMapApp/1.0'
            }
        });
        const data = await response.json();
        onlineResults = data.map(item => ({
            type: 'nominatim',
            displayName: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
            osmType: item.type,
            address: item.address
        }));
    } catch (error) {
        console.warn('Nominatim search error:', error);
    }

    // Kết hợp kết quả
    container.innerHTML = '';

    if (localResults.length === 0 && onlineResults.length === 0) {
        container.innerHTML = '<div style="padding:12px;color:#7f8c8d;text-align:center;">Không tìm thấy kết quả</div>';
        showToast('Không tìm thấy kết quả');
        setTimeout(() => { container.style.display = 'none'; }, 2000);
        return;
    }

    // Hiển thị kết quả local trước
    if (localResults.length > 0) {
        const localHeader = document.createElement('div');
        localHeader.style.cssText = 'padding:8px 12px;background:#e3f2fd;font-weight:600;font-size:12px;color:#1976d2;';
        localHeader.textContent = '📍 Kết quả từ dữ liệu bản đồ';
        container.appendChild(localHeader);

        localResults.slice(0, 5).forEach(r => {
            const div = createSearchResultItem(r, 'local');
            container.appendChild(div);
        });
    }

    // Hiển thị kết quả online
    if (onlineResults.length > 0) {
        const onlineHeader = document.createElement('div');
        onlineHeader.style.cssText = 'padding:8px 12px;background:#e8f5e9;font-weight:600;font-size:12px;color:#388e3c;margin-top:4px;';
        onlineHeader.textContent = '🌐 Kết quả tìm kiếm trực tuyến';
        container.appendChild(onlineHeader);

        onlineResults.forEach(r => {
            const div = createSearchResultItem(r, 'online');
            container.appendChild(div);
        });
    }
}

function createSearchResultItem(result, source) {
    const div = document.createElement('div');
    div.style.cssText = 'padding:12px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background 0.2s;';
    div.onmouseover = () => { div.style.background = '#f8f9fa'; };
    div.onmouseout = () => { div.style.background = 'white'; };

    if (source === 'local') {
        const typeMap = {
            'province': 'Tỉnh/Thành phố',
            'district': 'Quận/Huyện',
            'road': 'Đường'
        };
        const prettyType = typeMap[result.type] || result.type;

        div.innerHTML = `
            <div style="font-weight:600;color:#2c3e50;margin-bottom:4px;">${result.displayName}</div>
            <div style="font-size:12px;color:#7f8c8d;">${prettyType}${result.provinceName ? ' - ' + result.provinceName : ''}</div>
        `;

        div.addEventListener('click', function () {
            try {
                const bounds = L.geoJSON(result.feature).getBounds();
                if (bounds && bounds.isValid && bounds.isValid()) {
                    map.fitBounds(bounds.pad ? bounds.pad(0.2) : bounds, { maxZoom: 16 });
                } else if (result.feature.geometry && result.feature.geometry.type === 'Point') {
                    const coords = result.feature.geometry.coordinates;
                    map.setView([coords[1], coords[0]], 17);
                }
            } catch (e) {
                console.warn('Could not zoom to feature', e);
            }

            showAreaInfoPanel({
                type: prettyType,
                name: result.displayName,
                province: result.provinceName || ''
            });

            document.getElementById('search-results').style.display = 'none';
            document.getElementById('search-input').value = '';
        });
    } else {
        // Online result
        const typeMap = {
            'city': 'Thành phố',
            'town': 'Thị trấn',
            'village': 'Xã',
            'suburb': 'Quận/Huyện',
            'road': 'Đường',
            'house': 'Địa chỉ',
            'cafe': 'Quán cà phê',
            'restaurant': 'Nhà hàng',
            'hospital': 'Bệnh viện',
            'school': 'Trường học'
        };
        const prettyType = typeMap[result.osmType] || 'Địa điểm';

        // Rút gọn display name
        const nameParts = result.displayName.split(',');
        const shortName = nameParts.slice(0, 3).join(',');

        div.innerHTML = `
            <div style="font-weight:600;color:#2c3e50;margin-bottom:4px;">${shortName}</div>
            <div style="font-size:12px;color:#7f8c8d;">${prettyType}</div>
        `;

        div.addEventListener('click', function () {
            map.setView([result.lat, result.lon], 17);

            // Tạo marker tạm thời
            const tempMarker = L.marker([result.lat, result.lon])
                .addTo(map)
                .bindPopup(`
                    <strong>${shortName}</strong><br>
                    <small>${prettyType}</small><br>
                    <small style="color:#7f8c8d">Toạ độ: ${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}</small>
                `)
                .openPopup();

            setTimeout(() => {
                map.removeLayer(tempMarker);
            }, 10000);

            showAreaInfoPanel({
                type: prettyType,
                name: shortName,
                lat: result.lat,
                lng: result.lon
            });

            document.getElementById('search-results').style.display = 'none';
            document.getElementById('search-input').value = '';
        });
    }

    return div;
}

// Ẩn kết quả tìm kiếm khi click bên ngoài
document.addEventListener('click', function (e) {
    const searchResults = document.getElementById('search-results');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if (searchResults && !searchResults.contains(e.target) &&
        e.target !== searchInput && e.target !== searchBtn) {
        searchResults.style.display = 'none';
    }
});

// =============================================
// MENU MOBILE
// =============================================
const menuToggle = document.getElementById('menu-toggle');
const controlsPanel = document.getElementById('controls-panel');

menuToggle.addEventListener('click', function () {
    controlsPanel.classList.toggle('active');
});

// =============================================
// INFO PANEL
// =============================================
const infoPanel = document.getElementById('info-panel');
const closePanel = document.getElementById('close-panel');

closePanel.addEventListener('click', function () {
    infoPanel.classList.remove('active');
});

// Cập nhật hàm showAreaInfo để mở panel
function showAreaInfoPanel(info) {
    const infoDiv = document.getElementById('area-info');
    infoDiv.innerHTML = `
        <h4>${info.type}</h4>
        <p><strong>Tên:</strong> ${info.name}</p>
        ${info.code ? `<p><strong>Mã:</strong> ${info.code}</p>` : ''}
        ${info.province ? `<p><strong>Thuộc tỉnh:</strong> ${info.province}</p>` : ''}
        ${info.desc ? `<p><strong>Mô tả:</strong> ${info.desc}</p>` : ''}
        ${info.lat && info.lng ? `<p><strong>Toạ độ:</strong> ${info.lat.toFixed(6)}, ${info.lng.toFixed(6)}</p>` : ''}
    `;
    infoPanel.classList.add('active');
}

// =============================================
// GEOLOCATION - Truy cập vị trí thực
// =============================================
const locateBtn = document.getElementById('locate-btn');

if (locateBtn) {
    locateBtn.addEventListener('click', getUserLocation);
}

function getUserLocation() {
    if (!navigator.geolocation) {
        showToast('Trình duyệt của bạn không hỗ trợ định vị!');
        return;
    }

    if (locateBtn) {
        locateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = position.coords.accuracy;

            // Xoá marker cũ nếu có
            if (userLocationMarker) {
                try {
                    map.removeLayer(userLocationMarker);
                } catch (e) {
                    console.warn('Could not remove old location marker:', e);
                }
            }
            if (userLocationCircle) {
                try {
                    map.removeLayer(userLocationCircle);
                } catch (e) {
                    console.warn('Could not remove old location circle:', e);
                }
            }

            // Tạo circle cho độ chính xác
            userLocationCircle = L.circle([lat, lng], {
                radius: accuracy,
                color: '#3498db',
                fillColor: '#3498db',
                fillOpacity: 0.15,
                weight: 2
            }).addTo(map);

            // Tạo marker cho vị trí
            const locationIcon = L.divIcon({
                className: 'location-marker',
                html: `<div style="
                    width: 20px;
                    height: 20px;
                    background: #3498db;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 10px rgba(52,152,219,0.5);
                " class="location-pulse"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            userLocationMarker = L.marker([lat, lng], { icon: locationIcon })
                .addTo(map)
                .bindPopup(`
                    <strong>Vị trí của bạn</strong><br>
                    Toạ độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                    Độ chính xác: ±${Math.round(accuracy)}m
                `)
                .openPopup();

            // Di chuyển bản đồ đến vị trí
            map.setView([lat, lng], 16);

            if (locateBtn) {
                locateBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
            }

            showToast('Đã xác định vị trí của bạn');
        },
        function (error) {
            if (locateBtn) {
                locateBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
            }
            let errorMsg = 'Không thể xác định vị trí!';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = 'Bạn đã từ chối quyền truy cập vị trí!';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = 'Thông tin vị trí không khả dụng!';
                    break;
                case error.TIMEOUT:
                    errorMsg = 'Hết thời gian chờ xác định vị trí!';
                    break;
            }
            showToast(errorMsg);
            console.error('Geolocation error:', error);
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// Helper: lấy vị trí hiện tại dưới dạng Promise
function getCurrentPositionPromise(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            return reject(new Error('Geolocation not supported'));
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
}

// Khởi tạo vị trí người dùng khi vào web (im lặng nếu thất bại)
async function initUserLocation() {
    try {
        const pos = await getCurrentPositionPromise();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy || 50;

        if (userLocationMarker) map.removeLayer(userLocationMarker);
        if (userLocationCircle) map.removeLayer(userLocationCircle);

        userLocationCircle = L.circle([lat, lng], {
            radius: accuracy,
            color: '#3498db',
            fillColor: '#3498db',
            fillOpacity: 0.15,
            weight: 2
        }).addTo(map);

        const locationIcon = L.divIcon({
            className: 'location-marker',
            html: `<div style="
                width: 20px;
                height: 20px;
                background: #3498db;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 10px rgba(52,152,219,0.5);
            " class="location-pulse"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        userLocationMarker = L.marker([lat, lng], { icon: locationIcon })
            .addTo(map)
            .bindPopup(`
                <strong>Vị trí của bạn</strong><br>
                Toạ độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                Độ chính xác: ±${Math.round(accuracy)}m
            `);

        // Zoom đến vị trí hiện tại với độ zoom phù hợp
        map.setView([lat, lng], 15);

        console.log('Đã tự động zoom đến vị trí hiện tại');
    } catch (e) {
        // Không hiển thị lỗi cho người dùng, chỉ log
        console.warn('Không thể lấy vị trí hiện tại:', e.message);
    }
}

// =============================================
// THÊM MARKER - Gắn mốc địa điểm
// =============================================
const addMarkerBtn = document.getElementById('add-marker-btn');
const markerModal = document.getElementById('marker-modal');
const closeModal = document.getElementById('close-modal');
const saveMarkerBtn = document.getElementById('save-marker');
const cancelMarkerBtn = document.getElementById('cancel-marker');

// Tạo menu cho nút thêm marker
function createMarkerMenu() {
    // Xóa menu cũ nếu có
    const oldMenu = document.getElementById('marker-menu');
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement('div');
    menu.id = 'marker-menu';
    menu.style.cssText = `
        position: fixed;
        right: 90px;
        bottom: 20px;
        z-index: 2500;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        padding: 8px;
        display: none;
        min-width: 200px;
    `;

    menu.innerHTML = `
        <button id="add-at-location" style="
            width: 100%;
            padding: 12px;
            border: none;
            background: white;
            text-align: left;
            cursor: pointer;
            border-radius: 8px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: background 0.2s;
        ">
            <i class="fas fa-location-crosshairs" style="color: #2ecc71;"></i>
            <span>Tại vị trí hiện tại</span>
        </button>
        <button id="add-by-click" style="
            width: 100%;
            padding: 12px;
            border: none;
            background: white;
            text-align: left;
            cursor: pointer;
            border-radius: 8px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: background 0.2s;
            margin-top: 4px;
        ">
            <i class="fas fa-hand-pointer" style="color: #3498db;"></i>
            <span>Click trên bản đồ</span>
        </button>
    `;

    document.body.appendChild(menu);

    // Hover effects
    menu.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('mouseover', function () {
            this.style.background = '#f8f9fa';
        });
        btn.addEventListener('mouseout', function () {
            this.style.background = 'white';
        });
    });

    // Add at current location
    document.getElementById('add-at-location').addEventListener('click', async function () {
        menu.style.display = 'none';
        addMarkerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
            const pos = await getCurrentPositionPromise();
            tempMarkerPos = L.latLng(pos.coords.latitude, pos.coords.longitude);
            openMarkerModal();
            addMarkerBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
        } catch (err) {
            addMarkerBtn.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
            showToast('Không thể lấy vị trí: ' + err.message);
        }
    });

    // Add by clicking on map
    document.getElementById('add-by-click').addEventListener('click', function () {
        menu.style.display = 'none';
        isAddingMarker = true;
        addMarkerBtn.classList.add('active');
        map.getContainer().style.cursor = 'crosshair';
        showToast('Chạm vào bản đồ để đặt mốc');
    });

    return menu;
}

const markerMenu = createMarkerMenu();

// Toggle menu khi click nút
addMarkerBtn.addEventListener('click', function () {
    if (isAddingMarker) {
        // Nếu đang ở chế độ thêm marker, tắt nó
        isAddingMarker = false;
        addMarkerBtn.classList.remove('active');
        map.getContainer().style.cursor = '';
        markerMenu.style.display = 'none';
    } else {
        // Hiện menu
        markerMenu.style.display = markerMenu.style.display === 'block' ? 'none' : 'block';
    }
});

// Đóng menu khi click bên ngoài
document.addEventListener('click', function (e) {
    if (!addMarkerBtn.contains(e.target) && !markerMenu.contains(e.target)) {
        markerMenu.style.display = 'none';
    }
});

// Click trên bản đồ để đặt marker
map.on('click', function (e) {
    if (isAddingMarker) {
        tempMarkerPos = e.latlng;
        openMarkerModal();
    }
});

let editingMarkerId = null;

function openMarkerModal(editMode = false, markerId = null) {
    editingMarkerId = markerId;
    markerModal.classList.add('active');

    const modalTitle = document.querySelector('#marker-modal .modal-header h3');
    const saveBtn = document.getElementById('save-marker');

    if (editMode && markerId) {
        const marker = savedMarkers.find(m => m.id === markerId);
        if (marker) {
            modalTitle.textContent = 'Chỉnh sửa mốc';
            saveBtn.textContent = 'Cập nhật';
            document.getElementById('marker-name').value = marker.name;
            document.getElementById('marker-desc').value = marker.desc || '';

            // Set icon và color
            document.querySelectorAll('.icon-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.icon === marker.icon);
            });
            selectedIcon = marker.icon;

            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.toggle('selected', opt.dataset.color === marker.color);
            });
            selectedColor = marker.color;
        }
    } else {
        modalTitle.textContent = 'Thêm mốc đánh dấu';
        saveBtn.textContent = 'Lưu mốc';
        document.getElementById('marker-name').value = '';
        document.getElementById('marker-desc').value = '';
    }

    document.getElementById('marker-name').focus();
}

function closeMarkerModal() {
    markerModal.classList.remove('active');
    isAddingMarker = false;
    addMarkerBtn.classList.remove('active');
    map.getContainer().style.cursor = '';
    tempMarkerPos = null;
    editingMarkerId = null;
}

closeModal.addEventListener('click', closeMarkerModal);
cancelMarkerBtn.addEventListener('click', closeMarkerModal);

// Chọn icon
const iconOptions = document.querySelectorAll('.icon-option');
let selectedIcon = 'restaurant'; // Mặc định là quán ăn

iconOptions.forEach(option => {
    option.addEventListener('click', function () {
        iconOptions.forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        selectedIcon = this.dataset.icon;
    });
});

// Chọn màu
const colorOptions = document.querySelectorAll('.color-option');
let selectedColor = '#e74c3c';

colorOptions.forEach(option => {
    option.addEventListener('click', function () {
        colorOptions.forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        selectedColor = this.dataset.color;
    });
});

// Lưu marker
saveMarkerBtn.addEventListener('click', async function () {
    const name = document.getElementById('marker-name').value.trim();
    const desc = document.getElementById('marker-desc').value.trim();

    if (!name) {
        alert('Vui lòng nhập tên địa điểm!');
        return;
    }

    if (editingMarkerId) {
        // Chế độ chỉnh sửa
        const markerIndex = savedMarkers.findIndex(m => m.id === editingMarkerId);
        if (markerIndex !== -1) {
            savedMarkers[markerIndex].name = name;
            savedMarkers[markerIndex].desc = desc;
            savedMarkers[markerIndex].icon = selectedIcon;
            savedMarkers[markerIndex].color = selectedColor;

            // Cập nhật Firestore
            try {
                await updateMarkerInFirestore(editingMarkerId, {
                    name: name,
                    desc: desc,
                    icon: selectedIcon,
                    color: selectedColor,
                    updatedAt: new Date().toISOString()
                });
                console.log('✅ Đã cập nhật marker trong Firestore');
            } catch (error) {
                showToast('Lỗi cập nhật marker');
                console.error('Lỗi cập nhật marker:', error);
                return;
            }

            // Xóa marker cũ khỏi tất cả layers
            Object.values(markersLayers).forEach(layer => {
                layer.eachLayer(markerLayer => {
                    if (markerLayer.markerId === editingMarkerId) {
                        layer.removeLayer(markerLayer);
                    }
                });
            });

            // Thêm lại marker mới vào layer tương ứng
            addMarkerToMap(savedMarkers[markerIndex]);

            renderMarkersList();
            closeMarkerModal();
            showToast('Đã cập nhật mốc: ' + name);
        }
    } else {
        // Chế độ thêm mới
        if (!tempMarkerPos) {
            alert('Vui lòng chọn vị trí trên bản đồ!');
            return;
        }

        const markerData = {
            name: name,
            desc: desc,
            lat: tempMarkerPos.lat,
            lng: tempMarkerPos.lng,
            icon: selectedIcon,
            color: selectedColor,
            createdAt: new Date().toISOString(),
            reviews: []
        };

        // Lưu vào Firestore
        try {
            const firestoreId = await addMarkerToFirestore(markerData);
            markerData.id = firestoreId; // Gán ID từ Firestore
            savedMarkers.push(markerData);
            addMarkerToMap(markerData);
            console.log('✅ Đã lưu marker vào Firestore:', firestoreId);
        } catch (error) {
            showToast('Lỗi lưu marker');
            console.error('Lỗi lưu marker:', error);
            return;
        }

        renderMarkersList();
        updateMarkersCount();
        closeMarkerModal();
        showToast('Đã thêm mốc: ' + name);
    }
});

// Hàm tạo marker trên bản đồ
function addMarkerToMap(data) {
    // Map icon name sang Font Awesome class
    const iconMap = {
        'restaurant': 'utensils',
        'home': 'home',
        'store': 'store'
    };
    const faIcon = iconMap[data.icon] || 'map-marker-alt';

    const customIcon = L.divIcon({
        className: 'custom-marker-container',
        html: `<div class="custom-marker" style="background:${data.color}">
                   <i class="fas fa-${faIcon}"></i>
               </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });

    const googleMapsUrl = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
    const reviews = data.reviews || [];
    const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;
    const ratingStars = avgRating ? '⭐'.repeat(Math.round(avgRating)) : '';

    // Thêm marker vào layer tương ứng với icon
    let iconType = data.icon || 'restaurant';
    // Nếu icon không hợp lệ, mặc định là restaurant
    if (!iconTypes.includes(iconType)) {
        iconType = 'restaurant';
    }
    const targetLayer = markersLayers[iconType];

    const marker = L.marker([data.lat, data.lng], { icon: customIcon })
        .addTo(targetLayer)
        .bindPopup(`
            <div style="min-width:200px">
                <strong style="font-size:14px">${data.name}</strong>
                ${avgRating ? `<span class="average-rating" style="margin-left:8px;"><i class="fas fa-star"></i> ${avgRating} (${reviews.length})</span>` : ''}
                ${data.desc ? '<br><span style="color:#7f8c8d;font-size:12px">' + data.desc + '</span>' : ''}
                <br><small style="color:#95a5a6">${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}</small>
                <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
                    <a href="${googleMapsUrl}" target="_blank" style="display:inline-block;padding:6px 12px;background:#4285f4;color:white;text-decoration:none;border-radius:4px;font-size:12px;">
                        <i class="fas fa-map-marked-alt"></i> Google Maps
                    </a>
                    <button onclick="openMarkerModal(true, '${data.id}')" style="padding:6px 12px;background:#3498db;color:white;border:none;border-radius:4px;font-size:12px;cursor:pointer;">
                        <i class="fas fa-edit"></i> Chỉnh sửa
                    </button>
                    <button onclick="openReviewModal('${data.id}')" style="padding:6px 12px;background:#f39c12;color:white;border:none;border-radius:4px;font-size:12px;cursor:pointer;">
                        <i class="fas fa-star"></i> Đánh giá
                    </button>
                </div>
            </div>
        `)
        .bindTooltip(data.name, {
            permanent: true,
            direction: 'top',
            className: 'marker-label',
            offset: [0, -40]
        });

    marker.markerId = data.id;

    // marker.on('click', function () {
    //     showAreaInfoPanel({
    //         type: 'Mốc đánh dấu',
    //         name: data.name,
    //         desc: data.desc,
    //         lat: data.lat,
    //         lng: data.lng
    //     });
    // });

    return marker;
}

// Tải markers đã lưu từ Firestore
async function loadSavedMarkers() {
    try {
        // Load từ Firestore
        const markers = await loadMarkersFromFirestore();
        savedMarkers = markers.map(marker => {
            // Đảm bảo có trường reviews
            if (!marker.reviews) {
                marker.reviews = [];
            }
            return marker;
        });

        // Hiển thị markers lên bản đồ
        savedMarkers.forEach(data => {
            addMarkerToMap(data);
        });

        renderMarkersList();
        updateMarkersCount();
        isFirestoreReady = true;

        console.log(`✅ Đã tải ${savedMarkers.length} markers từ Firestore`);
    } catch (error) {
        console.error('Lỗi tải markers:', error);
        showToast('Lỗi tải dữ liệu từ server');
    }
}

// =============================================
// DANH SÁCH MARKERS
// =============================================
const markersList = document.getElementById('markers-list');
const showMarkersListBtn = document.getElementById('show-markers-list');
const closeMarkersListBtn = document.getElementById('close-markers-list');
const markersContainer = document.getElementById('markers-container');

// Cập nhật badge số lượng mốc
function updateMarkersCount() {
    if (savedMarkers.length > 0) {
        showMarkersListBtn.classList.add('has-markers');
        showMarkersListBtn.setAttribute('data-count', savedMarkers.length);
    } else {
        showMarkersListBtn.classList.remove('has-markers');
        showMarkersListBtn.removeAttribute('data-count');
    }
}

showMarkersListBtn.addEventListener('click', function () {
    markersList.classList.add('active');
    ensureMarkerFilterUI();
    renderMarkersList();
});

closeMarkersListBtn.addEventListener('click', function () {
    markersList.classList.remove('active');
});

function ensureMarkerFilterUI() {
    if (document.getElementById('marker-filter')) return;

    const filter = document.createElement('div');
    filter.id = 'marker-filter';
    filter.style.cssText = `
        padding: 12px;
        border-bottom: 2px solid #eee;
        background: #f8f9fa;
        display: flex;
        flex-direction: column;
        gap: 10px;
    `;

    // Input tìm kiếm theo tên
    const searchDiv = document.createElement('div');
    searchDiv.innerHTML = `
        <input type="text" 
               id="marker-filter-input" 
               placeholder="Tìm theo tên..." 
               style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
    `;
    filter.appendChild(searchDiv);

    // Select lọc theo màu
    const colorDiv = document.createElement('div');
    colorDiv.innerHTML = `
        <select id="marker-filter-color" 
                style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;">
            <option value="all">🎨 Tất cả màu</option>
            <option value="#e74c3c">🔴 Đỏ</option>
            <option value="#3498db">🔵 Xanh dương</option>
            <option value="#2ecc71">🟢 Xanh lá</option>
            <option value="#f39c12">🟠 Cam</option>
            <option value="#9b59b6">🟣 Tím</option>
            <option value="#1abc9c">🟦 Xanh ngọc</option>
        </select>
    `;
    filter.appendChild(colorDiv);

    // Thêm event listeners
    setTimeout(() => {
        document.getElementById('marker-filter-input').addEventListener('input', function () {
            markerFilterText = this.value.trim().toLowerCase();
            renderMarkersList();
        });

        document.getElementById('marker-filter-color').addEventListener('change', function () {
            markerFilterColor = this.value;
            renderMarkersList();
        });
    }, 0);

    // Chèn filter vào đầu markersContainer
    markersContainer.parentNode.insertBefore(filter, markersContainer);
}

function renderMarkersList() {
    // Áp dụng bộ lọc
    const filtered = savedMarkers.filter(m => {
        const matchText = markerFilterText ? m.name.toLowerCase().includes(markerFilterText) : true;
        const matchColor = markerFilterColor === 'all' ? true : m.color === markerFilterColor;
        return matchText && matchColor;
    });

    if (savedMarkers.length === 0) {
        markersContainer.innerHTML = `
            <div class="no-markers">
                <i class="fas fa-map-marker-alt"></i>
                <p>Chưa có mốc nào</p>
                <small>Nhấn nút <i class="fas fa-map-marker-alt"></i> để thêm mốc mới</small>
            </div>
        `;
        return;
    }

    if (filtered.length === 0) {
        markersContainer.innerHTML = `
            <div class="no-markers">
                <i class="fas fa-filter"></i>
                <p>Không tìm thấy mốc phù hợp</p>
                <small>Thử thay đổi bộ lọc</small>
            </div>
        `;
        return;
    }

    // Hiển thị số lượng kết quả
    const countInfo = document.createElement('div');
    countInfo.style.cssText = 'padding:8px 12px;background:#e8f5e9;color:#2ecc71;font-weight:600;font-size:13px;';
    countInfo.textContent = `Tìm thấy ${filtered.length} mốc${filtered.length !== savedMarkers.length ? ' / ' + savedMarkers.length + ' tổng' : ''}`;

    markersContainer.innerHTML = countInfo.outerHTML + filtered.map(marker => {
        const googleMapsUrl = `https://www.google.com/maps?q=${marker.lat},${marker.lng}`;
        const reviews = marker.reviews || [];
        const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

        // Map icon name sang Font Awesome class
        const iconMap = {
            'restaurant': 'utensils',
            'home': 'home',
            'store': 'store'
        };
        const faIcon = iconMap[marker.icon] || 'map-marker-alt';

        return `
        <div class="marker-item" data-id="${marker.id}">
            <div class="marker-item-icon" style="background:${marker.color}">
                <i class="fas fa-${faIcon}"></i>
            </div>
            <div class="marker-item-info">
                <div class="marker-item-name">${marker.name}</div>
                ${avgRating ? `<div class="marker-item-rating"><span class="average-rating"><i class="fas fa-star"></i> ${avgRating}</span> (${reviews.length} đánh giá)</div>` : ''}
                <div class="marker-item-desc">${marker.desc || 'Không có mô tả'}</div>
            </div>
            <div class="marker-item-actions">
                <a href="${googleMapsUrl}" target="_blank" class="marker-item-gmaps" title="Mở Google Maps">
                    <i class="fas fa-map-marked-alt"></i>
                </a>
                <button class="marker-item-edit" data-id="${marker.id}" title="Chỉnh sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="marker-item-delete" data-id="${marker.id}" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');

    // Click vào marker item để bay đến
    document.querySelectorAll('.marker-item').forEach(item => {
        item.addEventListener('click', function (e) {
            if (e.target.closest('.marker-item-delete')) return;
            if (e.target.closest('.marker-item-edit')) return;
            if (e.target.closest('.marker-item-gmaps')) return;

            const id = this.dataset.id; // Không convert sang int vì Firestore ID là string
            const marker = savedMarkers.find(m => m.id === id);
            if (marker) {
                map.setView([marker.lat, marker.lng], 16);
                markersList.classList.remove('active');

                // Mở popup của marker - tìm trong tất cả layers
                setTimeout(() => {
                    Object.values(markersLayers).forEach(layer => {
                        layer.eachLayer(markerLayer => {
                            if (markerLayer.markerId === id) {
                                markerLayer.openPopup();
                            }
                        });
                    });
                }, 300);
            }
        });
    });

    // Edit marker
    document.querySelectorAll('.marker-item-edit').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.dataset.id; // Firestore ID là string
            openMarkerModal(true, id);
        });
    });

    // Xoá marker
    document.querySelectorAll('.marker-item-delete').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.dataset.id; // Firestore ID là string
            deleteMarker(id);
        });
    });
}

async function deleteMarker(id) {
    if (!confirm('Bạn có chắc muốn xoá mốc này?')) return;

    // Tìm marker để biết icon type
    const markerData = savedMarkers.find(m => m.id === id);

    // Xoá khỏi Firestore
    try {
        await deleteMarkerFromFirestore(id);
        console.log('✅ Đã xóa marker khỏi Firestore');
    } catch (error) {
        showToast('Lỗi xóa marker');
        console.error('Lỗi xóa marker:', error);
        return;
    }

    // Xoá khỏi mảng local
    savedMarkers = savedMarkers.filter(m => m.id !== id);

    // Xoá khỏi bản đồ - tìm trong tất cả các layers
    if (markerData) {
        const iconType = markerData.icon || 'location-dot';
        const targetLayer = markersLayers[iconType] || markersLayers['location-dot'];

        targetLayer.eachLayer(layer => {
            if (layer.markerId === id) {
                targetLayer.removeLayer(layer);
            }
        });
    } else {
        // Fallback: tìm trong tất cả layers nếu không tìm thấy data
        Object.values(markersLayers).forEach(layer => {
            layer.eachLayer(markerLayer => {
                if (markerLayer.markerId === id) {
                    layer.removeLayer(markerLayer);
                }
            });
        });
    }

    // Cập nhật danh sách và badge
    renderMarkersList();
    updateMarkersCount();

    showToast('Đã xoá mốc');
}

// Control markers layer visibility by dropdown
document.getElementById('icon-filter-select').addEventListener('change', function (e) {
    const selectedType = e.target.value;

    // Hiển thị hoặc ẩn các layer dựa trên lựa chọn
    iconTypes.forEach(iconType => {
        if (markersLayers[iconType]) {
            if (selectedType === 'all' || selectedType === iconType) {
                map.addLayer(markersLayers[iconType]);
            } else {
                map.removeLayer(markersLayers[iconType]);
            }
        }
    });
});

// =============================================
// TOAST NOTIFICATION
// =============================================
function showToast(message) {
    // Xoá toast cũ nếu có
    const oldToast = document.querySelector('.toast-notification');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 160px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        z-index: 3000;
        font-size: 14px;
        animation: fadeInUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Thêm animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);

// =============================================
// REVIEW & RATING SYSTEM
// =============================================
const reviewModal = document.getElementById('review-modal');
const closeReviewModalBtn = document.getElementById('close-review-modal');
const cancelReviewBtn = document.getElementById('cancel-review');
const saveReviewBtn = document.getElementById('save-review');
const starRating = document.getElementById('star-rating');
const reviewsContainer = document.getElementById('reviews-container');

let currentReviewMarkerId = null;
let selectedRating = 0;

// Star rating interaction
starRating.querySelectorAll('i').forEach((star, index) => {
    star.addEventListener('mouseenter', function () {
        highlightStars(index + 1);
    });

    star.addEventListener('click', function () {
        selectedRating = parseInt(this.dataset.rating);
        setActiveStars(selectedRating);
    });
});

starRating.addEventListener('mouseleave', function () {
    setActiveStars(selectedRating);
});

function highlightStars(count) {
    starRating.querySelectorAll('i').forEach((star, index) => {
        star.classList.toggle('hover', index < count);
    });
}

function setActiveStars(count) {
    starRating.querySelectorAll('i').forEach((star, index) => {
        star.classList.toggle('active', index < count);
        star.classList.remove('hover');
    });
}

// Open review modal
function openReviewModal(markerId) {
    currentReviewMarkerId = markerId;
    const marker = savedMarkers.find(m => m.id === markerId);

    if (!marker) return;

    // Đảm bảo marker có trường reviews
    if (!marker.reviews) {
        marker.reviews = [];
    }

    document.getElementById('review-marker-name').textContent = marker.name;
    document.getElementById('review-comment').value = '';
    document.getElementById('review-author').value = '';
    selectedRating = 0;
    setActiveStars(0);

    // Display existing reviews
    displayReviews(marker.reviews);

    reviewModal.classList.add('active');
}

// Close review modal
function closeReviewModal() {
    reviewModal.classList.remove('active');
    currentReviewMarkerId = null;
}

closeReviewModalBtn.addEventListener('click', closeReviewModal);
cancelReviewBtn.addEventListener('click', closeReviewModal);

// Save review
saveReviewBtn.addEventListener('click', async function () {
    if (selectedRating === 0) {
        alert('Vui lòng chọn số sao đánh giá!');
        return;
    }

    const comment = document.getElementById('review-comment').value.trim();
    const author = document.getElementById('review-author').value.trim() || 'Ẩn danh';

    const markerIndex = savedMarkers.findIndex(m => m.id === currentReviewMarkerId);
    if (markerIndex === -1) return;

    // Đảm bảo có trường reviews
    if (!savedMarkers[markerIndex].reviews) {
        savedMarkers[markerIndex].reviews = [];
    }

    const review = {
        id: Date.now(),
        rating: selectedRating,
        comment: comment,
        author: author,
        date: new Date().toISOString()
    };

    savedMarkers[markerIndex].reviews.push(review);

    // Cập nhật Firestore
    try {
        await updateMarkerInFirestore(currentReviewMarkerId, {
            reviews: savedMarkers[markerIndex].reviews,
            updatedAt: new Date().toISOString()
        });
        console.log('✅ Đã cập nhật review trong Firestore');
    } catch (error) {
        showToast('Lỗi lưu đánh giá');
        console.error('Lỗi lưu review:', error);
        return;
    }

    // Update marker on map - xóa từ tất cả layers
    Object.values(markersLayers).forEach(layer => {
        layer.eachLayer(markerLayer => {
            if (markerLayer.markerId === currentReviewMarkerId) {
                layer.removeLayer(markerLayer);
            }
        });
    });

    // Thêm lại marker với thông tin mới
    addMarkerToMap(savedMarkers[markerIndex]);

    // Update list
    renderMarkersList();

    // Show success and update reviews display
    const avgRating = (savedMarkers[markerIndex].reviews.reduce((sum, r) => sum + r.rating, 0) / savedMarkers[markerIndex].reviews.length).toFixed(1);
    showToast(`Đã thêm đánh giá! Rating trung bình: ${avgRating} ⭐`);

    displayReviews(savedMarkers[markerIndex].reviews);

    // Reset form
    document.getElementById('review-comment').value = '';
    document.getElementById('review-author').value = '';
    selectedRating = 0;
    setActiveStars(0);
});

// Display reviews
function displayReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        reviewsContainer.innerHTML = '<p style="color:#7f8c8d;text-align:center;padding:20px;">Chưa có đánh giá nào</p>';
        return;
    }

    // Sort by date descending
    const sortedReviews = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));

    reviewsContainer.innerHTML = sortedReviews.map(review => {
        const stars = '⭐'.repeat(review.rating);
        const date = new Date(review.date).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-author">${review.author}</span>
                    <span class="review-stars">${stars}</span>
                </div>
                <div class="review-date">${date}</div>
                ${review.comment ? `<div class="review-comment">${review.comment}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Make functions available globally for popup buttons
window.openReviewModal = openReviewModal;
window.openMarkerModal = openMarkerModal;

// Khởi tạo
loadGeoJSONData();
loadSavedMarkers();

// Đợi một chút để map render xong, sau đó tự động zoom đến vị trí hiện tại
setTimeout(() => {
    initUserLocation();
}, 500);