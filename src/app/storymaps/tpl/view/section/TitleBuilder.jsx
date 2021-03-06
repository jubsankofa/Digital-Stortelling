import Title from './Title';
import {} from 'lib-build/less!./TitleBuilder';

import SectionCommon from 'storymaps/tpl/view/section/Common';
import AddMenu from './builder/AddMenu';

import topic from 'dojo/topic';
import lang from 'dojo/_base/lang';

export default class TitleBuilder extends Title {

  constructor(section, media) {
    super(section);

    this._initialMedia = media;
    this._addMenu = new AddMenu({
      buttons: ['sequence', 'title', 'immersive']
    });

    this.MEDIA_BUILDER_TABS_BACKGROUND = ['section-appearance', 'background', 'manage'];
  }

  render() {
    if (! this._section.layout) {
      this._section.layout = 'title-regular';
    }

    // Creating a new section
    if (! this._section.background) {
      this._section.background = this._initialMedia || { type: 'empty', empty: 'empty' };
      this._section.foreground = { title: '', credits: '', options: {}};
    }

    if (!this._section.foreground.options) {
      this._section.foreground.options = {};
    }

    return super.render();
  }

  postCreate(params) {
    super.postCreate(params);

    this._addMenu.postCreate({
      container: this._node.find('.builder-section-add-menu'),
      sectionContainer: this._node
    });

    this._node.find('.fg-title')
      .attr('contenteditable', true)
      .attr('placeholder', 'Enter a title...')
      .on('blur keyup', function() {
        this.serialize();
        this._onContentChange();
      }.bind(this))
      .on('paste', function() {
        setTimeout(function() {
          this._node.find('.fg-title').html($('<div>' + this._node.find('.fg-title').text() + '</div>').text());
          this.serialize();
          this._onContentChange();
        }.bind(this), 0);
      }.bind(this))
      .keydown(function(e) {
        // Do not allow enter key
        if (e.keyCode === 13) {
          // If pressing enter insert <br> instead of default behavior that is div
          //document.execCommand('insertHTML', false, '<br><br>');
          return false;
        }

        // Prevent ctrl + B/I/U or ctrl + b/i/u
        if(e.ctrlKey || e.metaKey) {
          var key = e.keyCode;
          if (key == 66 || key == 98 || key == 73 || key == 105 || key == 85 || key == 117) {
            return false;
          }
        }
      });
  }

  focus() {
    setTimeout(function() {
      this._node.find('.fg-title').focus();
    }.bind(this), 50);
  }

  serialize() {
    this._section.background = this._backgroundMedia.serialize();
    this._section.foreground.title = $('<div>' + this._node.find('.fg-title').text() + '</div>').text();

    return lang.clone(this._section);
  }

  setBookmark(bookmark) {
    this._section.bookmark = {
      enabled: bookmark.status == 'visible',
      title: bookmark.bookmark
    };
  }

  _onContentChange() {
    topic.publish('builder-section-update');
  }

  _onToggleMediaConfig() {
    let activeClass = 'media-config-active';
    let configPanelActive = this._backgroundMedia.isConfigActive();
    const MEDIA_CONFIG_HEIGHT = 225;

    if (configPanelActive) {
      this._node.addClass(activeClass);

      // Scroll the page if there isn't enough room for the config panel
      let sectionNode = this._node[0];
      let sectionBBOX = sectionNode.getBoundingClientRect();
      let scrollOffset = 0;

      let mediaConfigHeight = MEDIA_CONFIG_HEIGHT;
      let bottomWithMediaConfig = sectionBBOX.bottom + mediaConfigHeight;

      if (bottomWithMediaConfig > app.display.windowHeight) {
        scrollOffset = app.display.windowHeight - bottomWithMediaConfig;
      }

      if (scrollOffset) {
        var currentScroll = document.body.scrollTop || document.documentElement.scrollTop;

        $('html,body').animate({
          scrollTop: currentScroll - scrollOffset + 50
        }, 150);
      }
    }
    else {
      this._node.removeClass(activeClass);
    }
  }

  _onMediaConfigAction(params = {}) {
    if (! params.action || ! params.media) {
      return;
    }

    if (params.action == 'swap') {
      var mediaIsEmpty = params.media.serialize().type == 'empty';

      app.builder.mediaPicker.open({
        mode: mediaIsEmpty ? 'add' : 'edit',
        media: mediaIsEmpty ? null : params.media.serialize(),
        authorizedMedia: ['image']
      }).then(
        function(newMedia) {
          this._onEditMedia(params.media, newMedia);
        }.bind(this),
        function() {
          //
        }
      );
    }

    this._onContentChange();
  }

  _applySectionConfig() {
    this._applyConfig();
    this._onContentChange();
  }

  _onEditMedia(media, newMediaJSON) {
    let newMedia = SectionCommon.initMedia(newMediaJSON);

    // Delete actual background
    this._node.find('.background').remove();

    // TODO: only if media not already rendered
    this._node.prepend(SectionCommon.renderBackground({
      media: newMedia
    }));

    newMedia.postCreate({
      container: this._node,
      onConfigAction: app.isInBuilder ? this._onMediaConfigAction.bind(this) : null,
      onToggleMediaConfig: app.isInBuilder ? this._onToggleMediaConfig.bind(this) : null,
      builderConfigurationTabs: this.MEDIA_BUILDER_TABS_BACKGROUND,
      foregroundOptions: this._section.foreground.options,
      applySectionConfig: app.isInBuilder ? this._applySectionConfig.bind(this) : null,
      sectionType: 'title'
    });

    // TODO: this may be an issue if picking a map/scene already present
    newMedia.load();

    if (media.type != 'empty') {
      this._onToggleMediaConfig();
    }

    media.destroy();

    this._backgroundMedia = newMedia;
    this._applySectionConfig();
  }
}
