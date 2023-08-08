var currentIndex = 0;
var followings;
var fProfileTabId = 0;
var linkedInFollowingTab = 0;

var headers = ["S.No","Name","Profile Url","Headline","Talks about info","Location","No of followers","Contact info"];

// Oninstall set storage
chrome.runtime.onInstalled.addListener(function () {
    chrome.storage.local.set({'followingProfiles':''});   
});

chrome.runtime.onMessage.addListener(function (message, sender, send_response) {
    if (message.type == 'followingLinks'){
        followings = message.data;
        linkedInFollowingTab = sender.tab.id;
        startScrapFollowingProfile();
    }else if( message.action ==='scraped_following_details'){		
        currentIndex = currentIndex+1;
		startScrapFollowingProfile(followings,currentIndex);
		chrome.tabs.remove(sender.tab.id);
    }
});

function startScrapFollowingProfile(){
    if(followings.length > 0){
        followingsLength = followings.length;
        console.log("window Index " +currentIndex);
        if(currentIndex <= followingsLength-1){
            url = followings[currentIndex];
            chrome.tabs.create({ url: url ,active:false },function (tab) {
                fProfileTabId = tab.id;
                chrome.tabs.onUpdated.addListener(scrapTabListener);            
            });
        }else{
            chrome.storage.local.get(["followingProfiles"], function(result) {
                console.log(result);
               if(result.followingProfiles!="" && result.followingProfiles!="undefined" ){
                followingProfilesArray = result.followingProfiles;
                   console.log(result);
                   createFollowingCsvData(followingProfilesArray).then(function (csvData) {;
                        getCurrentTab().then(function (tab) {
                            chrome.tabs.sendMessage(tab.id,{type:'downloadCsv', from: 'background', data:csvData, msg:'Please wait. Exporting as CSV'});
                        });
                   });       
               }   
           });
   
       }
    }

}

async function getCurrentTab() {
    let queryOptions = { active: true, currentWindow: true };
    let [tab] = await chrome.tabs.query(queryOptions);
    console.log(tab);
    return tab;
}
  
function scrapTabListener(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tabId === fProfileTabId) {
      chrome.tabs.sendMessage(fProfileTabId, {
        type: 'infoScraping',
        from: 'background',
        index:currentIndex,
      });
      chrome.tabs.onUpdated.removeListener(scrapTabListener);
    }
}

async function createFollowingCsvData(dataArray) {
    const csvRows = [headers.join(",")];
    let i = 0;
    for (const profile of dataArray) {
        i++;
        const row = [
            i,
            profile.name,
            profile.profileUrl,
            profile.description,
            profile.talksAbout,
            profile.location,
            profile.follower,
            profile.contactInfo,
        ];
        csvRows.push(row.join(","));
    }
    return csvRows.join("\n");
}

function resetProcess(){
	fProfileTabId = 0;
	followings = []
	currentIndex = 0;
	chrome.storage.local.set({'followingProfiles':''});	
}

chrome.tabs.onRemoved.addListener(function(tabId) {
    if(tabId == fProfileTabId){
       resetProcess();
    }
});	



