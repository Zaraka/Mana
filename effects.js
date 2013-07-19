game.SmallText = me.ObjectEntity.extend({
    font: null,
    text: null,
    init: function(x, y, text, font) {
        this.font = font;
        this.text = text;
        settings = {};
        settings.spritewidth = 0;
        settings.spriteheight = 0;
        this.parent(x, y, settings);
        //console.log("creating SmallText " + this.pos.x + " " + this.pos.y);
    }, draw: function(context){
        this.font.draw(context, this.text, this.pos.x, this.pos.y);
    }
});

game.BigText = me.ObjectEntity.extend({
    text: null,
    font: null,
    timer: 2500,
    timer_run: null,
    init: function(text) {
        settings = {};
        settings.spritewidth = 0;
        settings.spriteheight = 0;
        var player = me.game.getEntityByGUID(me.gamestat.getItemValue("player"));
        this.parent(0,0, settings);
        this.text = text;
        this.timer_run = me.timer.getTime();
        this.font = new me.BitmapFont("geebeeyay-8x8", 8, 1.0);
        this.floating = true;
    }, draw: function(context) {
        this.parent(context);
        var size = this.font.measureText(context, this.text);
        var x = (game.screenWidth / 2) - (size.width / 2);
        var y = (game.screenHeight / 2)  - (size.height / 2);
        this.font.draw(context, this.text, x, y);
    }, update: function() {
        if (me.timer.getTime() > (this.timer_run + this.timer)) {
            me.game.remove(this);
        }
        
        this.parent();
        return true;
    }, onDestroyEvent: function() {
        this.font = null;
    }
});

game.BigStaticText = me.ObjectEntity.extend({
    init: function(x, y,text, font) {
        settings = {};
        var size = font.measureText(me.video.getScreenContext(), text);
        settings.spritewidth = size.width;
        settings.spriteheight = size.height;
        settings.image = me.video.createCanvas(settings.spritewidth, settings.spriteheight);
        
        var context = settings.image.getContext("2d");
        font.draw(context, text, 0, 0);
        this.parent(x,y, settings);
        this.floating = true;
    }
});

game.HitText = game.SmallText.extend({
    timer: 0,
    local_pos: null,
    slower: null,
    direction: null,
    start_pos: null,
    init: function(x, y, text, font) {
        this.parent(x, y, text, font);
        this.local_pos = new me.Vector2d(0, 0);
        this.slower = true;
        this.direction = Number.prototype.random(0, 1);
    },
    update: function() {
        if (this.local_pos.x >= 20) {
            me.game.remove(this);
        }
        if (this.slower) {
            if (this.direction === 1) {
                this.pos.x += this.local_pos.x;
            } else {
                this.pos.x -= this.local_pos.x;
            }
            this.pos.y += this.local_pos.y;
            this.local_pos.x += 1;
            this.local_pos.y = 20 - Math.floor(Math.abs(Math.pow(this.local_pos.x, 2)) / 12);
            if (this.direction === 1) {
                this.pos.x -= this.local_pos.x;
            } else {
                this.pos.x += this.local_pos.x;
            }
            this.pos.y = this.pos.y - this.local_pos.y;
        }
        this.slower = !this.slower;
        this.parent();
        return true;
    }
});

game.effects.SpeakText = game.SmallText.extend({
    timer: 1500,
    timer_run: null,
    init: function(x, y, text) {
        var font = game.fonts.white;
        this.parent(x, y, text, font);
        this.timer_run = me.timer.getTime();
    },
    update: function() {
        if (me.timer.getTime() > (this.timer + this.timer_run)) {
            me.game.remove(this);
        }
        this.parent();
        return true;
    }    
});

game.effects.ExpText = game.SmallText.extend({
    timer: 700,
    timer_run: null,
    init: function(x, y, text) {
        var font = game.fonts.magic_blue;
        this.parent(x, y, text, font);
        this.setVelocity(0.45, 0.45);
        this.timer_run = me.timer.getTime();
    },
    update: function() {
        if (me.timer.getTime() > (this.timer + this.timer_run)) {
            me.game.remove(this);
        }
        
        this.vel.y -= this.accel.y * me.timer.tick;
        this.updateMovement();
        this.parent();
        return true;
    }
});

game.DropTooltip = me.ObjectEntity.extend({
    text: null,
    type: null,
    init: function(x, y, text, type){
        this.text = text;
        this.type = type;
        settings = {};
        settings.spritewidth = game.fonts.white.measureText(me.video.getScreenContext(), this.text).width + 3;
        settings.spriteheight = 13;
        settings.image = me.video.createCanvas(settings.spritewidth, settings.spriteheight);
        
        var context = settings.image.getContext("2d");
        context.fillStyle = "#404040";
        context.fillRect(0,0,settings.spritewidth, settings.spriteheight);
        this.drawText(context, settings.spritewidth);
        
        this.parent(x, y, settings);
        this.renderable.setOpacity(0.85);
    },
    drawText: function(context, width){
        switch(this.type){
            case "normal":
                game.fonts.white.draw(context, this.text, (width / 2) - (game.fonts.white.measureText(context, this.text).width / 2), 2);
                break;
            case "magic":
                game.fonts.magic_blue.draw(context, this.text, (width / 2) - (game.fonts.white.measureText(context, this.text).width / 2), 2);
                break;
            case "rare":
                game.fonts.rare_purple.draw(context, this.text, (width / 2) - (game.fonts.white.measureText(context, this.text).width / 2), 2);
                break;
            case "epic":
                game.fonts.good_green.draw(context, this.text, (width / 2) - (game.fonts.white.measureText(context, this.text).width / 2), 2);
                break;
            case "gold":
                game.fonts.gold.draw(context, this.text, (width / 2) - (game.fonts.white.measureText(context, this.text).width / 2), 2);
                break;
            default:
                console.log("Error choosing rarity tooltip");
        }
    },
    update: function(){
        this.parent();
        return true;
    }
});

game.effects.RedScreen = me.ObjectEntity.extend({
    init: function(){
        settings.spritewidth = game.screenWidth;
        settings.spriteheight = game.screenHeight;
        settings.image = me.video.createCanvas(settings.spritewidth, settings.spriteheight);
        
        var context = settings.image.getContext("2d");
        context.fillStyle = "red";
        context.fillRect(0,0, settings.spritewidth, settings.spriteheight);
       
        this.parent(0, 0, settings);
        this.floating = true;
        this.renderable.setOpacity(0.45);
    }
});