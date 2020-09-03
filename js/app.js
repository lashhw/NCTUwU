const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    onOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

let courseData = {};
let selectedCourse = {};
let department = {}

let filter = {
    department: false,
    departmentId: -1,
};

firebase.initializeApp(firebaseConfig);
firebase.analytics?.();

const db = firebase.database();

window.addEventListener("message", function (event) {
    if (event.origin === OAUTH_ORIGIN) {
        const { data } = event;
        firebase.auth().signInWithCustomToken(data.token).then(user => {
            if (user.additionalUserInfo.isNewUser) {
                firebase.auth().currentUser.updateEmail(data.email);
                save();
            }
        })
    }
}, false);

firebase.auth().onAuthStateChanged(function (user) {
    document.getElementById("user-status").textContent = user ? `嗨，${user.uid}` : "Login";
    document.getElementById("user-status").onclick = user ? undefined : login;

    if (user && !share) {
        db.ref(`user/${firebase.auth().currentUser.uid}/`)
            .once("value", function (snapshot) {
                if (!snapshot.val()) return;
                const { course = {}, lastUpdate: remoteLastUpdate } = snapshot.val();
                const isSame = Object.keys(selectedCourse) === Object.keys(course) &&
                    Object.keys(course).sort().every((value, index) => value === Object.keys(selectedCourse).sort()[index])
                const localLastUpdate = +localStorage.getItem("lastUpdate");

                // sync: remote to local
                if (!isSame && new Date(localLastUpdate) < new Date(remoteLastUpdate)) {
                    Toast.fire({ text: "已從伺服器更新你的課表" });
                    selectedCourse = course;
                    save(false);
                }
                renderAllSelected();
            })
    }
});

const login = () => {
    document.getElementById("user-status").textContent = "...";
    document.getElementById("user-status").onclick = undefined;
    window.open(`https://id.nctu.edu.tw/o/authorize/?client_id=${OAUTH_CLIENT_ID}&response_type=code&scope=profile`)
}

// Safari sucks.

const supportBigInt = typeof BigInt !== 'undefined';
if (!supportBigInt) BigInt = JSBI.BigInt;

function parseBigInt(value, radix = 36) {
    const add = (a, b) => supportBigInt ? a + b : JSBI.add(a, b);
    const mul = (a, b) => supportBigInt ? a * b : JSBI.multiply(a, b);
    return [...value.toString()]
        .reduce((r, v) => add(
            mul(r, BigInt(radix)),
            BigInt(parseInt(v, radix))
        ), BigInt(0));
}

function loadFromShareLink() {
    const shareKey = new URLSearchParams(location.search).get("share");
    const courseIds = parseBigInt(shareKey).toString().match(/.{1,4}/g);
    return courseIds.reduce((a, b) => (a[b] = true, a), {});
}

function loadFromLocalStorage() {
    return JSON.parse(localStorage.getItem("selectedCourse")) || {};
}

const totalCredits = () => Object.keys(selectedCourse).reduce((accu, id) => +courseData[id].credit + accu, 0);

let share = false;
if (location.search.includes("share=")) {
    share = true;
    document.querySelector(".sidebar").classList.add("is-hidden");
    document.querySelector("#import").classList.remove("is-hidden");
}

// Render timetable.
Object.keys(TIME_MAPPING).forEach(period => {
    const div = document.createElement("div");
    div.textContent = `${period} / ${TIME_MAPPING[period]}`;
    document.querySelector(".time-interval").appendChild(div);
});

Object.keys(TIME_MAPPING).forEach(period => {
    for (let day = 1; day <= 7; ++day) {
        const div = document.createElement("div");
        div.id = `${day}${period}`;
        document.querySelector('.content').appendChild(div);
    }
});

// Fetch course data.
Promise.all([
    `course-data/${YEAR}${SEMESTER}-data.json`,
    `course-data/department.json`
].map(url => fetch(url).then(r => r.json())))
    .then(response => {
        const [data, department] = response;

        courseData = data;
        selectedCourse = share ? loadFromShareLink() : loadFromLocalStorage();

        document.querySelector(".input").disabled = false;
        document.querySelector(".input").placeholder = "課號 / 課名 / 老師";
        document.querySelector(".credits").textContent = `${totalCredits()} 學分`;
        renderAllSelected();
        renderDepartment(department);
    });

function setFilter(filterData) {
    Object.entries(filterData)
        .forEach(([key, value]) => {
            if (key in filter)
                filter[key] = value;
            else
                throw `${key} not in filter!`;
        });
    renderSearchResult();
}

function renderDepartment(department) {
    const renderSelect = (id, options) => {
        document.querySelector(`.department[data-level="${id}"]`).parentElement.classList.remove('is-hidden')
        document.querySelector(`.department[data-level="${id}"]`).innerHTML =
            (id === 1 ? "<option selected>全部開課單位</option>" : "<option disabled selected>選擇開課單位</option>") +
            Object.entries(options).map(
                ([name]) => `<option>${name}</option>`
            ).join('');
    }
    renderSelect(1, department);
    document.querySelectorAll('select').forEach((elem, _, selects) =>
        elem.onchange = ({ target }) => {
            const level = +target.dataset.level;
            let currentValue;
            if (level === 1) {
                if (elem.value === "全部開課單位") {
                    setFilter({ department: false, departmentId: -1 });
                    selects[1].parentElement.classList.add('is-hidden');
                    selects[2].parentElement.classList.add('is-hidden');
                    return;
                }
                currentValue = department[elem.value];
            }
            else if (level === 2)
                currentValue = department[selects[0].value][elem.value];
            else
                currentValue = department[selects[0].value][selects[1].value][elem.value]

            const hasNextLevel = !(typeof currentValue === 'number');
            if (hasNextLevel)
                renderSelect(level + 1, currentValue)
            else
                setFilter({ department: true, departmentId: currentValue });

            selects.forEach(select =>
                (+select.dataset.level > level + hasNextLevel) &&
                select.parentElement.classList.add('is-hidden')
            );
        }
    )
}

function renderAllSelected() {
    document.querySelector(".credits").textContent = `${totalCredits()} 學分`;
    document.querySelectorAll(".timetable .content>div").forEach(elem => elem.firstElementChild?.remove())
    document.querySelector(".selected").innerHTML = '';
    for (courseId in selectedCourse) {
        const course = courseData[courseId];
        renderPeriodBlock(course);
        appendCourseElement(course);
    }
}

function getCourseIdFromElement(element) {
    return element.closest('.course,.period').dataset.id;
}

document.addEventListener("click", function ({ target }) {
    if (target.classList.contains('toggle-course'))
        toggleCourse(getCourseIdFromElement(target));

    if (target.classList.contains('modal-launcher'))
        openModal(getCourseIdFromElement(target));
})

document.addEventListener("mouseover", function (event) {
    if (event.target.matches('.result .course, .result .course *')) {
        const courseId = getCourseIdFromElement(event.target);
        const result = parseTime(courseData[courseId].time);
        result.forEach(period => {
            const block = document.getElementById(period);
            if (block.childElementCount)
                block.firstElementChild.classList.add("has-background-danger", "has-text-white");
            block.classList.add('has-background-info-light');
        })
    }
})

document.addEventListener("mouseout", function (event) {
    if (event.target.matches('.result .course, .result .course *')) {
        document.querySelectorAll('.timetable>.content>[class="has-background-info-light"]')
            .forEach(elem => {
                elem.className = '';
                elem.firstElementChild?.classList.remove("has-background-danger", "has-text-white");
            });
    }
})

function openModal(courseId) {
    const modal = document.querySelector('.modal');
    modal.classList.add('is-active')

    const data = courseData[courseId];
    const fields = modal.querySelectorAll('dd');
    fields[0].textContent = data.id;
    fields[1].textContent = data.credit;
    fields[2].textContent = data.teacher;
    fields[3].textContent = data.time;

    modal.querySelector('.card-header-title').textContent = data.name;
    modal.querySelector('#outline').href = `https://timetable.nctu.edu.tw/?r=main/crsoutline&Acy=${YEAR}&Sem=${SEMESTER}&CrsNo=${courseId}&lang=zh-tw`;
}

function appendCourseElement(course, search = false) {
    const template = document.getElementById("courseTemplate");
    template.content.getElementById("type").textContent = COURSE_TYPE[course.type];
    const typeColor = course.type === 0 ? 'is-white' :
                      course.type === 1 ? 'is-danger' :
                      'is-primary';
    template.content.getElementById("type").className = `tag is-rounded ${typeColor}`;
    template.content.getElementById("name").textContent = course.name;
    template.content.getElementById("detail").textContent = `${course.id}・${course.teacher}・${+course.credit} 學分`;
    template.content.querySelector(".course").dataset.id = course.id;
    template.content.querySelector(".toggle-course").classList.toggle('is-selected', course.id in selectedCourse)

    const clone = document.importNode(template.content, true);
    document.querySelector(search ? ".result" : ".selected").appendChild(clone);
}

function search(searchTerm) {
    if (!searchTerm &&
        !(filter.department)
    ) return [];

    const regex = RegExp(searchTerm, 'i');
    const result = Object.values(courseData)
        .filter(course => ((
            !searchTerm ||
            course.id == searchTerm ||
            course.teacher.match(regex) ||
            course.name.match(regex)) &&
            (!filter.department || course.dep.includes(filter.departmentId))
        )).slice(0, 150);

    return result;
}

function save(remote = true) {
    const lastUpdate = +new Date();
    localStorage.setItem("selectedCourse", JSON.stringify(selectedCourse));
    localStorage.setItem("lastUpdate", +new Date());

    if (firebase.auth().currentUser && remote)
        db.ref(`user/${firebase.auth().currentUser.uid}/`).set({
            course: selectedCourse,
            lastUpdate: lastUpdate
        });
}

function toggleCourse(courseId) {
    const button = document.querySelector(`.course[data-id="${courseId}"] .toggle-course`);
    if (courseId in selectedCourse) { // Remove course
        delete selectedCourse[courseId];

        document.querySelector(`.selected [data-id="${courseId}"]`).remove();
        document.querySelectorAll(`.period[data-id="${courseId}"]`).forEach(elem => elem.remove());
        button?.classList.remove('is-selected');
    } else { // Select course
        const periods = parseTime(courseData[courseId].time);
        const isConflict = periods.some(period => document.getElementById(period).childElementCount)
        if (isConflict) {
            Toast.fire({
                icon: 'error',
                title: "和目前課程衝堂了欸"
            });
            return;
        }
        selectedCourse[courseId] = true;
        appendCourseElement(courseData[courseId]);
        renderPeriodBlock(courseData[courseId]);
        button?.classList.add('is-selected');
    }
    save();
    document.querySelector(".credits").textContent = `${totalCredits()} 學分`;
}

function parseTime(timeCode) {
    const timeList = timeCode.match(/[1-7][A-Z]+/g);
    const result = timeList.map(
        code => [...code].map(char => `${code[0]}${char}`).slice(1)
    ).flat();

    return result;
}

function renderPeriodBlock(course) {
    const periods = parseTime(course.time);
    periods.forEach(period => document.getElementById(period).innerHTML = `
    <div data-id="${course.id}" class="period modal-launcher">
        <span>${course.name}</span>
    </div>`);
}

function renderSearchResult(searchTerm) {
    document.querySelector(".result").innerHTML = '';
    if (typeof searchTerm === 'undefined')
        searchTerm = document.querySelector(".input").value.trim();
    const result = search(searchTerm);
    result.forEach(course => appendCourseElement(course, true));
}

document.querySelector(".input").oninput = event => {
    const searchTerm = event.target.value.trim();
    if (searchTerm.includes("'"))
        document.querySelector(".result").textContent = "1064 - You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ''' at line 1.";

    renderSearchResult(searchTerm);
}

document.getElementById("import").onclick = () => {
    Swal.fire({
        title: '匯入課表',
        text: "接下來將會覆蓋你目前的課表ㄛ，確定嗎？",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '匯入'
    }).then(result => {
        if (result.value) {
            save();
            Toast.fire({
                title: `<a href=${APP_URL}>匯入完成！點此前往選課模擬</a>`,
                icon: "success"
            });
        }
    })
}

document.getElementById("copy-link").onclick = () => {
    const shareKey = BigInt(Object.keys(selectedCourse).join('')).toString(36);

    const link = `${APP_URL}?share=${shareKey}`;
    const copy = document.createElement("div");
    copy.textContent = link;
    document.body.appendChild(copy);

    const textRange = document.createRange();
    textRange.selectNode(copy);
    const selet = window.getSelection();
    selet.removeAllRanges();
    selet.addRange(textRange);

    try {
        document.execCommand('copy');
        Toast.fire({
            title: `<a href="${link}" target="_blank">複製好了！點此可直接前往</a>`,
            icon: "success"
        });
    } catch (err) {
        console.log('Oops, unable to copy');
    }

    document.body.removeChild(copy);
}

document.querySelector('.modal-background').onclick =
    document.querySelector('.card-header-icon').onclick =
    () => document.querySelector('.modal').classList.remove('is-active');