const jwt = require("jsonwebtoken");
const User = require("../models/user.models");
const Amount = require("../models/amount.models");
// const user = require("../services/user.service");

const OneSignal = require("onesignal-node");
const client = new OneSignal.Client(
  "a1c86044-240f-4885-ae93-f5bc754cb589",
  "OWY0MWU2OTUtZDg1MC00NzVkLWJiMDMtNGVjYTNkNmM2NzJh"
);

function sendPushNotification(token, text) {
  return new Promise(async (res, rej) => {
    const notification = {
      contents: {
        en: "Helloo",
      },
      // include_player_ids: ["d803026f-a32c-4bcc-b77f-2bf6383af22c"], // for sending one device
      included_segments: ["Subscribed Users"],
    };

    try {
      const response = await client.createNotification(notification);
      return res(response);
    } catch (e) {
      return rej(e);
    }
  });
}

const signup = async (req, res) => {
  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };
  User.findOne({ email: req.body.email }).then((user) => {
    if (user) {
      return res.status(404).json({ message: "User already registered" });
    } else if (!validateEmail(req.body.email)) {
      return res.status(404).json({ message: "Please enter valid email" });
    } else {
      const name = req.body.name;
      const email = req.body.email;
      const phone = req.body.phone;
      const amount = 0;
      const password = req.body.password;
      let user = new User({
        name,
        email,
        phone,
        amount,
        password,
      });
      user
        .save()
        .then((data) => {
          console.log(data);
          // const newData = {name:data.name,email:data.email,phone:data.phone,data}
          res
            .status(201)
            .json({ status: "success", message: "Account created.", data });
        })
        .catch((e) => res.status(500).json({ error: e }));
    }
  });
};

const login = async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const filter = { email: email };
  User.find(filter).then(async (result) => {
    if (result.length == 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Incorrect email" });
    } else {
      const user = result[0];
      const user_data = {
        user_id: result[0]._id,
      };
      // let check = await checkPswd(user.password, password);
      if (email !== user.email) {
        return res
          .status(404)
          .json({ status: "error", message: "Incorrect email" });
      }

      if (password !== user.password) {
        return res
          .status(404)
          .json({ status: "error", message: "Incorrect password" });
      }

      let accessToken = jwt.sign({ user_data }, "access-key-secrete", {
        expiresIn: "2d",
      });
      // let refreshToken = jwt.sign({ user }, "refresh-key-secrete", {
      //   expiresIn: "7d",
      // });

      const update = {
        access_token: accessToken,
        //refresh_token: refreshToken,
      };

      User.findOneAndUpdate(filter, update, { new: true }).then((result) => {});

      const tokens = {
        accessToken,
        // refreshToken,
      };
      sendPushNotification();
      return res.status(200).json({
        status: "success",
        data: tokens,
        message: "Logged in successfully",
      });
    }
  });
};

const logout = async (req, res) => {
  const user_id = req.user.user_data.user_id;
  const email = req.body.email;
  const filter = { _id: user_id };
  User.find(filter).then((result) => {
    const user = result[0];
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const update = {
      access_token: "",
      // refresh_token: "",
    };
    User.findOneAndUpdate(filter, update, { new: true }).then((result) => {});

    return res
      .status(200)
      .json({ status: "success", message: "Logged out successfully" });
  });
};

function getByUserId(req, res) {
  let user_id = req.user.user_data.user_id;
  User.findById(user_id)
    .select("-password -access_token")
    .then((data) => {
      res.status(200).json({ status: "success", data: data });
    });
}

function addAmount(req, res, next) {
  let user_id = req.user.user_data.user_id;
  User.findById(user_id).then((data) => {
    const newAmount = { amount: data.amount + req.body.amount };
    history(user_id, req.body.amount, req.body.date);
    User.findByIdAndUpdate(user_id, newAmount, (err, emp) => {
      if (err) {
        return res
          .status(500)
          .send({ error: "Problem with Updating the   Employee recored " });
      }
      res.send({ success: "Updation successfull" });
    });
  });
}

function history(user, rate, date) {
  let amount = new Amount({
    user,
    rate,
    date,
  });
  amount.save().then((data) => {
    // res.status(200).json({ status: "success", data: data });
    console.log(data);
  });
}

function getAll(req, res, next) {
  let user_id = req.user.user_data.user_id;
  Amount.find({ user: user_id }).then((data) => {
    res.status(200).json({ status: "success", data: data });
  });
}

function getUsers(req, res) {
  User.find()
    .select("-password -access_token")
    .then((data) => {
      res.status(200).json({ status: "success", data: data });
    });
}

function getByAmt(req, res) {
  let user_id = req.user.user_data.user_id;
  Amount.find({ user: user_id }).then((data) => {
    if (data[0].user == user_id) {
      const newData = data.filter((item) => item.date == req.body.date);
      res
        .status(200)
        .json({ status: "success", message: "available", data: newData });
    } else {
      return res
        .status(200)
        .json({ status: "success", message: "No data found" });
    }
  });
}

const filterByDate = (req, res) => {
  console.log(req.body);
  let user_id = req.user.user_data.user_id;
  Amount.find({ user: user_id }).then((data) => {
    if (data[0].user == user_id) {
      var startDate = new Date(req.body.start_date);
      var endDate = new Date(req.body.end_date);

      var resultProductData = data.filter((a) => {
        var date = new Date(a.date);
        return date >= startDate && date <= endDate;
      });

      res.status(200).json({
        status: "success",
        message: "available",
        data: resultProductData,
      });
    } else {
      return res
        .status(200)
        .json({ status: "success", message: "No data found" });
    }
  });
};

module.exports = {
  signup,
  login,
  logout,
  getByUserId,
  addAmount,
  getAll,
  getUsers,
  getByAmt,
  filterByDate,
};
