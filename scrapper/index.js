const axios = require("axios");
const requestor = require("./requestor");
const { parseHtmlToDOM } = require("./parser");
const { removeWhiteSpace, removeCssAndJSFromHTML } = require("./helper");

const _axios = axios.create({
  baseURL: "https://www.livescores.com",
  timeout: 20000
});

function _getDetailMatchJSONFromHTMLDOM($) {
  const finalJSON = {
    scorers: { home: [], away: [] },
    cards: { home: [], away: [] }
  };
  // loop body content to get details matches
  $("body")
    .children()
    .each(function(_, elm) {
      if (elm.className.indexOf("row-gray") > -1) {
        // get minute actions
        const minuteAt = $(elm)
          .find(".min")
          .text();
        // get score
        const score = removeWhiteSpace(
          $(elm)
            .find(".sco")
            .text()
        );
        const isGoal = score != "&nbsp;";
        // children for action
        const actionChildElm = $(elm).children(".ply");
        // index 0 => home
        // index 1 => away
        const homeActionPlayerName = removeWhiteSpace(
          $(actionChildElm[0])
            .find(".name")
            .text()
        );
        const awayActionPlayerName = removeWhiteSpace(
          $(actionChildElm[1])
            .find(".name")
            .text()
        );

        if (isGoal && homeActionPlayerName != "") {
          finalJSON.scorers.home.push({
            currScore: score,
            minuteAt: minuteAt,
            name: homeActionPlayerName
          });
        } else if (isGoal && awayActionPlayerName != "") {
          finalJSON.scorers.away.push({
            currScore: score,
            minuteAt: minuteAt,
            name: awayActionPlayerName
          });
        } else if (!isGoal && homeActionPlayerName != "") {
          const isRedCard = $(actionChildElm[0]).find(".yellowcard").length < 1;
          finalJSON.cards.home.push({
            type: isRedCard ? "Red" : "Yellow",
            minuteAt: minuteAt,
            name: homeActionPlayerName
          });
        } else if (!isGoal && awayActionPlayerName != "") {
          const isRedCard = $(actionChildElm[1]).find(".yellowcard").length < 1;
          finalJSON.cards.away.push({
            type: isRedCard ? "Red" : "Yellow",
            minuteAt: minuteAt,
            name: awayActionPlayerName
          });
        }
      }
    });
  return finalJSON;
}

async function _getDetailMatch(_axios, url) {
  let html = await requestor(_axios, url);
  html = removeCssAndJSFromHTML(html);
  if (html != "") {
    const $ = parseHtmlToDOM(html);
    return await _getDetailMatchJSONFromHTMLDOM($);
  }
  return {};
}

async function _getLeagueInformationJSONFromHTMLDOM($, _axios) {
  const finalJSON = {};
  const nestedContentElm = "body > .wrapper > .content";

  const selectDOM = $(nestedContentElm);
  if (selectDOM.length < 1 || selectDOM.children().length < 1) {
    throw "No element founded";
  }

  // initialize variable
  let regLeague = "";
  let leagueName = "";
  let matchDate = "";
  let promises = [];
  let promisesInformation = {};

  for (let index = 0; index < selectDOM.children().length; index++) {
    let elm = selectDOM.children()[index];
    // section, example : England (Premier League)
    if (elm.className.indexOf("row-tall") > -1) {
      // it used for get league and match date
      const childElm = $(elm).children(".clear");

      // check left elm
      if (childElm.length > 0) {
        // left text includes league name and region league
        const leftText = removeWhiteSpace(childElm.find(".left").text());

        // validation left text
        if (leftText != "") {
          let [newRegLeague, newLeagueName] = leftText.split("-");
          regLeague = removeWhiteSpace(newRegLeague);
          leagueName = removeWhiteSpace(newLeagueName);
        }

        // insert region league to json
        if (regLeague != "" && !finalJSON.hasOwnProperty(regLeague)) {
          finalJSON[regLeague] = {};
        }

        // insert league name to json
        if (
          leagueName != "" &&
          !finalJSON[regLeague].hasOwnProperty(leagueName)
        ) {
          finalJSON[regLeague][leagueName] = {};
        }

        // matches date always using right class element
        matchDate = removeWhiteSpace(childElm.find(".right").text());
        if (
          matchDate != "" &&
          !finalJSON[regLeague][leagueName].hasOwnProperty(matchDate)
        ) {
          finalJSON[regLeague][leagueName][matchDate] = [];
        }
      }
    } else if (elm.className.indexOf("row-gray") > -1) {
      if (regLeague != "" && leagueName != "" && matchDate != "") {
        // start kick off
        const kickOffAt = removeWhiteSpace(
          $(elm)
            .find(".min")
            .text()
        );

        // special to do for team
        // index 0 => home
        // index 1 => away
        const team = $(elm).find(".ply");
        const teamHome = removeWhiteSpace($(team[0]).text());
        const teamAway = removeWhiteSpace($(team[1]).text());

        // for score, check if the value != ? - ? or if you have hrefElm, then you have to fetch the data from spesific url
        const scoreElm = $(elm).find(".sco");
        const score = removeWhiteSpace(scoreElm.text());
        const urlDetailMatch = $(scoreElm)
          .children("a")
          .attr("href");

        // store index pushed for flagging at promise.all
        let indexPushed = finalJSON[regLeague][leagueName][matchDate].push({
          kickOffAt: kickOffAt,
          teamHome: teamHome,
          teamAway: teamAway,
          score: score,
          details: {}
        });

        // store index promises for flagging at promise.all
        if (typeof urlDetailMatch != "undefined" && urlDetailMatch != "") {
          let indexPromises = promises.push(
            _getDetailMatch(_axios, urlDetailMatch)
          );
          promisesInformation[indexPromises - 1] = {
            regLeague: regLeague,
            leagueName: leagueName,
            matchDate: matchDate,
            index: indexPushed - 1
          };
        }
      }
    }
  }

  const responses = await Promise.all(promises);
  for (let i = 0; i < responses.length; i++) {
    let detail = responses[i];
    if (Object.keys(detail).length > 0) {
      let promsInfo = promisesInformation[i];
      finalJSON[promsInfo.regLeague][promsInfo.leagueName][promsInfo.matchDate][
        promsInfo.index
      ]["details"] = detail;
    }
  }
  return finalJSON;
}

async function scrapLiveScoreWeb() {
  try {
    const html = await requestor(_axios, "/");
    const $ = parseHtmlToDOM(html);
    const finalJSON = _getLeagueInformationJSONFromHTMLDOM($, _axios);
    return finalJSON;
  } catch (e) {
    return e;
  }
}

module.exports = {
  livescores: scrapLiveScoreWeb
};
